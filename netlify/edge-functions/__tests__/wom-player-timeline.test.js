import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

globalThis.Deno = {
  env: { get: (k) => (k === 'ALLOWED_ORIGIN' ? 'https://www.siege-clan.com' : undefined) },
};

const { default: handler, config } = await import('../wom-player-timeline.js');

const call = (query) =>
  handler(
    new Request(`https://www.siege-clan.com/api/wom-player-timeline?${query}`, {
      headers: { Origin: 'https://www.siege-clan.com' },
    }),
    {}
  );

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

/** WOM answers the id lookup, then the timeline (newest first, as WOM does). */
function womAnswers(timeline, username = 'dan xo') {
  globalThis.fetch.mockImplementation(async (url) =>
    String(url).includes('/players/id/') ? json({ id: 323559, username }) : json(timeline)
  );
}

const snap = (day, value) => ({ date: `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`, value, rank: 1 });

describe('wom-player-timeline', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('caches per player and period at the edge', async () => {
    expect(config.cache).toBe('manual');
    womAnswers([]);
    const res = await call('id=323559&period=week');
    expect(res.status).toBe(200);
    expect(res.headers.get('Netlify-Vary')).toBe('query=id|period');
  });

  it('looks the username up from the id and asks for Overall XP over the period', async () => {
    womAnswers([]);
    await call('id=323559&period=year');
    const [lookup, timeline] = globalThis.fetch.mock.calls.map(([url]) => new URL(url));
    expect(lookup.pathname).toBe('/v2/players/id/323559');
    expect(timeline.pathname).toBe('/v2/players/dan%20xo/snapshots/timeline');
    expect(timeline.searchParams.get('metric')).toBe('overall');
    expect(timeline.searchParams.get('period')).toBe('year');
  });

  it('defaults to a month', async () => {
    womAnswers([]);
    const body = await (await call('id=323559')).json();
    expect(body.period).toBe('month');
  });

  it('returns points oldest first, without WOM\'s -1 for unranked', async () => {
    womAnswers([snap(3, 300), snap(2, -1), snap(1, 100)]);
    const body = await (await call('id=323559&period=week')).json();
    expect(body.points).toEqual([
      { date: '2026-11-01T12:00:00.000Z', value: 100 },
      { date: '2026-11-03T12:00:00.000Z', value: 300 },
    ]);
  });

  it('thins a long year to 120 points, keeping the first and last', async () => {
    const many = Array.from({ length: 456 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 10, 12) + i * 3600000 * 19).toISOString(),
      value: 1000 + i,
    }));
    womAnswers([...many].reverse());
    const { points } = await (await call('id=323559&period=year')).json();
    expect(points).toHaveLength(120);
    expect(points[0].value).toBe(1000);
    expect(points[119].value).toBe(1455);
  });

  it.each([
    ['a missing id', 'period=week'],
    ['a non-numeric id', 'id=../groups/2928&period=week'],
    ['an unknown period', 'id=323559&period=decade'],
  ])('refuses %s without calling WOM', async (_label, query) => {
    const res = await call(query);
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('passes a WOM 404 through', async () => {
    globalThis.fetch.mockResolvedValue(json({ message: 'Player not found' }, 404));
    expect((await call('id=1&period=week')).status).toBe(404);
  });
});
