import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runWeeklyTitles, retryDelay } = require('../weekly-titles.cjs');

const W = 7 * 864e5;
const W9 = '2026-11-09T19:00:00.000Z'; // first week awarded
const W16 = '2026-11-16T19:00:00.000Z';
const W23 = '2026-11-23T19:00:00.000Z';
const quiet = () => {};

const gain = (id, gained, name = `p${id}`) => ({ player: { id, username: name.toLowerCase(), displayName: name }, data: { gained } });

/**
 * WOM stand-in: data[metric] is the rows for any window, except "overall"
 * windows that end at a week start (the Resurrected's look-back), which use
 * data.overallBefore.
 */
function fakeWom(data) {
  return vi.fn(async (start, end, metric) => {
    if (metric === 'overall' && (end.getTime() - start.getTime()) > W) return data.overallBefore || [];
    return data[metric] || [];
  });
}

function fakeSupabase({ doneWeeks = [], memberIds = [1, 2, 3, 4, 5, 6] } = {}) {
  const rpc = vi.fn(async (name, args) => ({ data: (args.p_awards || args.p_rows).length, error: null }));
  return {
    rpc,
    from(table) {
      if (table === 'members') return { select: async () => ({ data: memberIds.map((wom_id) => ({ wom_id })), error: null }) };
      if (table === 'weekly_title_weeks') {
        return { select: () => ({ gte: async () => ({ data: doneWeeks.map((week_start) => ({ week_start })), error: null }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const awardCall = (supabase, weekStart) =>
  supabase.rpc.mock.calls.find(([n, a]) => n === 'award_weekly_titles' && a.p_week_start === weekStart)?.[1];
const standingsCall = (supabase) => supabase.rpc.mock.calls.find(([n]) => n === 'set_weekly_title_standings')?.[1];

// Tuesday 17 Nov: the week of 9-16 Nov has closed; 16-23 is in progress.
const NOW = new Date('2026-11-17T12:00:00Z');

describe('runWeeklyTitles', () => {
  it('awards last week and writes this week\'s live standings', async () => {
    const supabase = fakeSupabase();
    const fetchGains = fakeWom({ ehb: [gain(1, 8.47), gain(2, 7.98), gain(3, 7.94), gain(4, 1)] });

    await runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0 });

    const award = awardCall(supabase, W9);
    expect(award.p_week_end).toBe(W16);
    expect(award.p_awards).toEqual([
      { title: 'warrior', wom_id: 1, player_name: 'p1', placement: 1, value: 8.47, points_awarded: 150 },
      { title: 'warrior', wom_id: 2, player_name: 'p2', placement: 2, value: 7.98, points_awarded: 100 },
      { title: 'warrior', wom_id: 3, player_name: 'p3', placement: 3, value: 7.94, points_awarded: 50 },
    ]);

    const live = standingsCall(supabase);
    expect(live.p_week_start).toBe(W16);
    // Standings keep everyone in the race, the minimum is applied on display.
    expect(live.p_rows.filter((r) => r.title === 'warrior').map((r) => r.wom_id)).toEqual([1, 2, 3, 4]);
  });

  it('adds up every raid for The Raider, and every boss WOM tracks for The Boss Hunter', async () => {
    const supabase = fakeSupabase();
    const fetchGains = fakeWom({
      chambers_of_xeric: [gain(1, 11), gain(2, 13)],
      tombs_of_amascut: [gain(1, 6)],
      the_fractured_archive: [gain(3, 6)],
      zulrah: [gain(1, 300)],
      vorkath: [gain(1, 233), gain(2, 120)],
    });
    const fetchBosses = vi.fn(async () => ['zulrah', 'vorkath']);

    await runWeeklyTitles({ supabase, fetchGains, fetchBosses, now: NOW, log: quiet, gapMs: 0 });

    const awards = awardCall(supabase, W9).p_awards;
    expect(awards.filter((a) => a.title === 'raider').map((a) => [a.wom_id, a.value, a.placement])).toEqual([
      [1, 17, 1],
      [2, 13, 2],
      [3, 6, 3],
    ]);
    expect(awards.filter((a) => a.title === 'boss_hunter').map((a) => [a.wom_id, a.value])).toEqual([
      [1, 533],
      [2, 120],
    ]);
    // The boss list is fetched once a run, not once per week.
    expect(fetchBosses).toHaveBeenCalledTimes(1);
  });

  it('counts only members, and only players back after 4 quiet weeks for The Resurrected', async () => {
    const supabase = fakeSupabase({ memberIds: [1, 2, 3] });
    const fetchGains = fakeWom({
      overall: [gain(1, 310064), gain(2, 206444), gain(3, 500000), gain(99, 900000)],
      overallBefore: [gain(1, 0), gain(2, 0), gain(3, 1200), gain(99, 0)],
    });

    await runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0 });

    const resurrected = awardCall(supabase, W9).p_awards.filter((a) => a.title === 'resurrected');
    // 3 was active before; 99 is not a member.
    expect(resurrected.map((a) => [a.wom_id, a.placement])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('never awards a week twice', async () => {
    const supabase = fakeSupabase({ doneWeeks: ['2026-11-09T19:00:00+00:00'] });
    await runWeeklyTitles({
      supabase,
      fetchGains: fakeWom({ ehb: [gain(1, 9)] }),
      fetchBosses: async () => [],
      now: NOW,
      log: quiet,
      gapMs: 0,
    });
    expect(supabase.rpc.mock.calls.map(([n]) => n)).toEqual(['set_weekly_title_standings']);
  });

  it('records a week where nobody reached a minimum, so it is done', async () => {
    const supabase = fakeSupabase();
    await runWeeklyTitles({
      supabase,
      fetchGains: fakeWom({ ehb: [gain(1, 2)] }), // under 5 EHB
      fetchBosses: async () => [],
      now: NOW,
      log: quiet,
      gapMs: 0,
    });
    expect(awardCall(supabase, W9).p_awards).toEqual([]);
  });

  it('leaves a week WOM shows nothing for, fails, and still writes live standings', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn(async (start) => (start.toISOString() === W16 ? [gain(1, 3)] : []));

    await expect(
      runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0 })
    ).rejects.toThrow(/WOM showed no member gaining anything/);
    expect(awardCall(supabase, W9)).toBeUndefined();
    expect(standingsCall(supabase).p_rows.length).toBeGreaterThan(0);
  });

  it('awards a week left unawarded after the next one closed, oldest first', async () => {
    const supabase = fakeSupabase();
    await runWeeklyTitles({
      supabase,
      fetchGains: fakeWom({ ehb: [gain(1, 9)] }),
      fetchBosses: async () => [],
      now: new Date('2026-11-24T10:00:00Z'),
      log: quiet,
      gapMs: 0,
    });
    const weeks = supabase.rpc.mock.calls.filter(([n]) => n === 'award_weekly_titles').map(([, a]) => a.p_week_start);
    expect(weeks).toEqual([W9, W16]);
    expect(standingsCall(supabase).p_week_start).toBe(W23);
  });

  it('waits and retries when WOM rate-limits', async () => {
    const supabase = fakeSupabase();
    let calls = 0;
    const fetchGains = vi.fn(async (start, end, metric) => {
      calls++;
      if (calls === 1) throw new Error('WOM returned 429 for https://api.wiseoldman.net/...');
      return metric === 'ehb' ? [gain(1, 9)] : [];
    });
    const sleep = vi.fn(async () => {});

    await runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0, sleep });

    expect(sleep).toHaveBeenCalledWith(20000);
    expect(awardCall(supabase, W9).p_awards[0].wom_id).toBe(1);
  });

  it('retries a dropped connection instead of failing the run (16:08 UTC, 17 Nov)', async () => {
    const supabase = fakeSupabase({ doneWeeks: ['2026-11-09T19:00:00+00:00'] });
    let calls = 0;
    const fetchGains = vi.fn(async (start, end, metric) => {
      calls++;
      if (calls === 1) throw new TypeError('terminated');
      return metric === 'ehb' ? [gain(1, 9)] : [];
    });
    const sleep = vi.fn(async () => {});

    await runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0, sleep });

    expect(sleep).toHaveBeenCalledWith(5000);
    expect(standingsCall(supabase).p_rows.find((r) => r.title === 'warrior').wom_id).toBe(1);
  });

  it('still fails after repeated drops, so a real outage is noticed', async () => {
    const supabase = fakeSupabase({ doneWeeks: ['2026-11-09T19:00:00+00:00'] });
    const fetchGains = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(
      runWeeklyTitles({ supabase, fetchGains, fetchBosses: async () => [], now: NOW, log: quiet, gapMs: 0, sleep: async () => {} })
    ).rejects.toThrow(/fetch failed/);
    expect(fetchGains).toHaveBeenCalledTimes(4);
  });
});

describe('retryDelay', () => {
  it.each([
    ['WOM returned 429 for https://api.wiseoldman.net/v2/...', 20000],
    ['WOM returned 502 for https://api.wiseoldman.net/v2/...: Bad Gateway', 5000],
    ['terminated', 5000],
    ['fetch failed', 5000],
    ['read ECONNRESET', 5000],
    ['WOM returned 404 for https://api.wiseoldman.net/v2/...', null],
    ['WOM group gained response was not a list', null],
  ])('%s -> %s', (message, wait) => {
    expect(retryDelay(new Error(message))).toBe(wait);
  });
});
