import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  COOLDOWN_MS,
  RaceRefreshError,
  refreshDecision,
  fetchSnapshots,
  refreshRaces,
} = require('../utils/raceProgress.cjs');

const NOW = new Date('2026-11-09T22:00:00Z');
const RACE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

const participant = (overrides) => ({
  id: 'p1',
  wom_id: 7,
  metric: 'sailing',
  target_value: 20000,
  start_value: 50000,
  current_value: 0,
  baseline_set_at: ago(86_400_000),
  updated_at: ago(60 * 60_000),
  is_winner: false,
  ...overrides,
});

const snapshot = (xp) => ({ skills: { sailing: { experience: xp } } });

/** A WOM stand-in: GET /players/id/:id and POST /players/:username. */
function fakeWom({ stored = {}, fresh = {}, failUpdate = false } = {}) {
  return vi.fn(async (url, { method } = {}) => {
    const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, body: null });
    const byId = url.match(/\/players\/id\/(\d+)$/);
    if (byId) {
      const id = Number(byId[1]);
      if (!(id in stored)) return json({ message: 'Player not found' }, 404);
      return json({ id, username: `player${id}`, latestSnapshot: { data: snapshot(stored[id]) } });
    }
    const byName = url.match(/\/players\/player(\d+)$/);
    if (byName && method === 'POST') {
      if (failUpdate) return json({ message: 'Too soon' }, 429);
      const id = Number(byName[1]);
      return json({ id, username: `player${id}`, latestSnapshot: { data: snapshot(fresh[id]) } });
    }
    return json({}, 404);
  });
}

/** Service-role client stand-in: serves `races`, records every write. */
function fakeSupabase(races) {
  const writes = [];
  const from = (table) => {
    const q = { table, filters: [], inFilter: null, update: null };
    const builder = {
      select() { return builder; },
      eq(col, val) { q.filters.push([col, val]); return builder; },
      in(col, vals) { q.inFilter = [col, vals]; return builder; },
      update(values) { q.update = values; return builder; },
      then(resolve) {
        if (q.update) {
          writes.push({ table: q.table, values: q.update, filters: q.filters, in: q.inFilter });
          return Promise.resolve({ error: null }).then(resolve);
        }
        let rows = races;
        if (q.inFilter) rows = rows.filter((r) => q.inFilter[1].includes(r.id));
        for (const [col, val] of q.filters) rows = rows.filter((r) => r[col] === val);
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return builder;
  };
  return { from, writes };
}

describe('refreshDecision', () => {
  const race = (p) => ({ participants: [participant(p)] });

  it('is due once the cooldown has passed', () => {
    expect(refreshDecision(race({ updated_at: ago(COOLDOWN_MS.view + 1000) }), NOW, false)).toEqual({ due: true });
  });

  it('waits out the cooldown, and says how long', () => {
    expect(refreshDecision(race({ updated_at: ago(60_000) }), NOW, false)).toEqual({
      due: false,
      retryAfterSeconds: (COOLDOWN_MS.view - 60_000) / 1000,
    });
  });

  it('lets a forced refresh through sooner', () => {
    expect(refreshDecision(race({ updated_at: ago(COOLDOWN_MS.force + 1000) }), NOW, true)).toEqual({ due: true });
  });

  it('is always due while someone has no starting point yet', () => {
    expect(refreshDecision(race({ baseline_set_at: null, updated_at: ago(0) }), NOW, false)).toEqual({ due: true });
  });
});

describe('fetchSnapshots', () => {
  it('reads WOM\'s stored stats by default, without asking for an update', async () => {
    const fetchImpl = fakeWom({ stored: { 7: 55000 } });
    const snaps = await fetchSnapshots([7], { fetchImpl });
    expect(snaps.get(7)).toEqual(snapshot(55000));
    expect(fetchImpl.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('asks WOM for fresh hiscores when forced, and uses them', async () => {
    const fetchImpl = fakeWom({ stored: { 7: 55000 }, fresh: { 7: 61000 } });
    const snaps = await fetchSnapshots([7], { fetchImpl, force: true, apiKey: 'k' });
    expect(snaps.get(7)).toEqual(snapshot(61000));
    const post = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post[0]).toBe('https://api.wiseoldman.net/v2/players/player7');
    expect(post[1].headers['x-api-key']).toBe('k');
  });

  it('falls back to the stored stats when WOM refuses the update', async () => {
    const fetchImpl = fakeWom({ stored: { 7: 55000 }, failUpdate: true });
    const snaps = await fetchSnapshots([7], { fetchImpl, force: true });
    expect(snaps.get(7)).toEqual(snapshot(55000));
  });

  it('skips players WOM does not know, and looks each player up once', async () => {
    const fetchImpl = fakeWom({ stored: { 7: 55000 } });
    const snaps = await fetchSnapshots([7, 7, 8], { fetchImpl });
    expect([...snaps.keys()]).toEqual([7]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('refreshRaces', () => {
  const activeRace = (participants, extra = {}) => ({ id: RACE_ID, status: 'active', end_date: null, participants, ...extra });

  it.each([
    [[], 'non-empty'],
    [['not-a-uuid'], 'Invalid race id'],
    [Array.from({ length: 21 }, () => RACE_ID), 'At most 20'],
    [undefined, 'non-empty'],
  ])('rejects raceIds %j', async (raceIds, message) => {
    await expect(refreshRaces({ supabase: fakeSupabase([]), raceIds, now: NOW })).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining(message), statusCode: 400 })
    );
    await expect(refreshRaces({ supabase: fakeSupabase([]), raceIds, now: NOW })).rejects.toBeInstanceOf(RaceRefreshError);
  });

  it('updates progress and stamps when it was checked', async () => {
    const supabase = fakeSupabase([activeRace([participant()])]);
    const fetchImpl = fakeWom({ stored: { 7: 55000 } });

    const { results } = await refreshRaces({ supabase, raceIds: [RACE_ID], now: NOW, fetchImpl });

    expect(results).toEqual([{ raceId: RACE_ID, status: 'refreshed', updated: 1, completed: false }]);
    expect(supabase.writes).toEqual([
      expect.objectContaining({
        table: 'race_participants',
        values: { current_value: 5000, updated_at: NOW.toISOString() },
        filters: [['id', 'p1']],
      }),
    ]);
  });

  it('stamps participants whose progress did not change, so the cooldown sees the check', async () => {
    const supabase = fakeSupabase([activeRace([participant({ current_value: 5000 })])]);
    await refreshRaces({ supabase, raceIds: [RACE_ID], now: NOW, fetchImpl: fakeWom({ stored: { 7: 55000 } }) });
    expect(supabase.writes).toEqual([
      expect.objectContaining({ values: { updated_at: NOW.toISOString() }, in: ['id', ['p1']] }),
    ]);
  });

  it('stamps a racer WOM had no data for, so the race backs off instead of retrying every view', async () => {
    const supabase = fakeSupabase([activeRace([participant({ wom_id: 99 })])]);
    await refreshRaces({ supabase, raceIds: [RACE_ID], now: NOW, fetchImpl: fakeWom({ stored: {} }) });
    expect(supabase.writes).toEqual([
      expect.objectContaining({ values: { updated_at: NOW.toISOString() }, in: ['id', ['p1']] }),
    ]);
  });

  it('records a starting point straight away for a new racer, even inside the cooldown', async () => {
    const supabase = fakeSupabase([
      activeRace([participant({ baseline_set_at: null, start_value: 0, updated_at: ago(0) })]),
    ]);
    await refreshRaces({ supabase, raceIds: [RACE_ID], now: NOW, fetchImpl: fakeWom({ stored: { 7: 55000 } }) });
    expect(supabase.writes[0].values).toEqual({
      start_value: 55000,
      current_value: 0,
      baseline_set_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    });
  });

  it('does no work for a race checked within the cooldown', async () => {
    const supabase = fakeSupabase([activeRace([participant({ updated_at: ago(60_000) })])]);
    const fetchImpl = fakeWom({ stored: { 7: 55000 } });
    const { results } = await refreshRaces({ supabase, raceIds: [RACE_ID], now: NOW, fetchImpl });
    expect(results[0]).toMatchObject({ status: 'recently_refreshed' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(supabase.writes).toEqual([]);
  });

  it('leaves races that are not active alone', async () => {
    const supabase = fakeSupabase([activeRace([participant()], { status: 'completed' })]);
    const fetchImpl = fakeWom({ stored: { 7: 55000 } });
    const { results } = await refreshRaces({ supabase, raceIds: [RACE_ID, OTHER_ID], now: NOW, fetchImpl });
    expect(results).toEqual([
      { raceId: RACE_ID, status: 'not_active' },
      { raceId: OTHER_ID, status: 'not_active' },
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('marks a race completed once its end date has passed', async () => {
    const supabase = fakeSupabase([activeRace([participant()], { end_date: ago(1000) })]);
    const { results } = await refreshRaces({
      supabase, raceIds: [RACE_ID], now: NOW, fetchImpl: fakeWom({ stored: { 7: 55000 } }),
    });
    expect(results[0].completed).toBe(true);
    expect(supabase.writes).toContainEqual(
      expect.objectContaining({ table: 'races', values: { status: 'completed' }, filters: [['id', RACE_ID]] })
    );
  });
});
