import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runWeeklyXpAwards } = require('../weekly-xp-awards.cjs');

const row = (id, gained, name = `p${id}`) => ({
  player: { id, username: name.toLowerCase(), displayName: name },
  data: { gained },
});

/**
 * Just enough of supabase-js for the job. paidWeeks are week_start values as
 * Postgres returns them (+00:00, not Z), to check the job compares instants.
 */
function fakeSupabase({ paidWeeks = [], memberIds = [1, 2, 3, 4, 5, 6], rpcResult = 5 } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
  const gte = vi.fn(async () => ({ data: paidWeeks.map((week_start) => ({ week_start })), error: null }));
  return {
    rpc,
    gte,
    from(table) {
      if (table === 'xp_awards') return { select: () => ({ gte }) };
      if (table === 'members') {
        return { select: async () => ({ data: memberIds.map((wom_id) => ({ wom_id })), error: null }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const quiet = () => {};
const paidStarts = (supabase) => supabase.rpc.mock.calls.map(([, args]) => args.p_week_start);

// Weeks, all Monday 19:00 UK (GMT, so 19:00Z).
const W9 = '2026-11-09T19:00:00.000Z';
const W16 = '2026-11-16T19:00:00.000Z';
const W23 = '2026-11-23T19:00:00.000Z';

// Tuesday after the week of 16-23 Nov closed: weeks 9-16 and 16-23 are done.
const NOW = new Date('2026-11-24T10:00:00Z');

describe('runWeeklyXpAwards', () => {
  it('pays the top five members of a closed week', async () => {
    const supabase = fakeSupabase({ paidWeeks: ['2026-11-09T19:00:00+00:00'] });
    const fetchGains = vi.fn().mockResolvedValue([
      row(1, 9_000_000), row(2, 8_000_000), row(3, 7_000_000),
      row(4, 6_000_000), row(5, 5_000_000), row(6, 4_000_000),
    ]);

    const { weeks } = await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    expect(weeks.map((w) => w.status)).toEqual(['already_paid', 'paid']);
    expect(fetchGains).toHaveBeenCalledTimes(1);
    expect(fetchGains).toHaveBeenCalledWith(new Date(W16), new Date(W23));
    expect(supabase.rpc).toHaveBeenCalledWith('award_weekly_xp', {
      p_week_start: W16,
      p_week_end: W23,
      p_awards: [
        { wom_id: 1, player_name: 'p1', placement: 1, xp_gained: 9_000_000, points_awarded: 15 },
        { wom_id: 2, player_name: 'p2', placement: 2, xp_gained: 8_000_000, points_awarded: 10 },
        { wom_id: 3, player_name: 'p3', placement: 3, xp_gained: 7_000_000, points_awarded: 5 },
        { wom_id: 4, player_name: 'p4', placement: 4, xp_gained: 6_000_000, points_awarded: 2 },
        { wom_id: 5, player_name: 'p5', placement: 5, xp_gained: 5_000_000, points_awarded: 2 },
      ],
    });
  });

  it('still pays a week whose runs all failed, after the next week has closed', async () => {
    const supabase = fakeSupabase(); // neither week paid
    const fetchGains = vi.fn().mockResolvedValue([row(1, 100)]);

    const { weeks } = await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    expect(weeks.map((w) => w.status)).toEqual(['paid', 'paid']);
    expect(paidStarts(supabase)).toEqual([W9, W16]); // oldest first
  });

  it('skips players with no members row, so the next one is paid instead', async () => {
    const supabase = fakeSupabase({ paidWeeks: [W9], memberIds: [2, 3] });
    const fetchGains = vi.fn().mockResolvedValue([row(99, 9e6), row(2, 8e6), row(3, 7e6)]);

    await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    const awards = supabase.rpc.mock.calls[0][1].p_awards;
    expect(awards.map((a) => [a.wom_id, a.placement, a.points_awarded])).toEqual([
      [2, 1, 15],
      [3, 2, 10],
    ]);
  });

  it('does nothing when every recent week is paid, without calling WOM', async () => {
    const supabase = fakeSupabase({ paidWeeks: [W9, W16] });
    const fetchGains = vi.fn();

    const { weeks } = await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    expect(weeks.map((w) => w.status)).toEqual(['already_paid', 'already_paid']);
    expect(fetchGains).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('leaves a week unpaid when WOM shows no gains, so a later run can pay it', async () => {
    const supabase = fakeSupabase({ paidWeeks: [W9] });
    const { weeks } = await runWeeklyXpAwards({
      supabase,
      fetchGains: vi.fn().mockResolvedValue([row(1, 0)]),
      now: NOW,
      log: quiet,
    });

    expect(weeks.map((w) => w.status)).toEqual(['already_paid', 'no_gains']);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('never pays a week from before the award started', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn();
    // During the first week: the last completed one is 2-9 Nov.
    const { weeks } = await runWeeklyXpAwards({
      supabase,
      fetchGains,
      now: new Date('2026-11-12T12:00:00Z'),
      log: quiet,
    });

    expect(weeks).toEqual([]);
    expect(fetchGains).not.toHaveBeenCalled();
  });

  it('pays the first week (9-16 Nov) once it closes', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn().mockResolvedValue([row(1, 100)]);
    await runWeeklyXpAwards({ supabase, fetchGains, now: new Date('2026-11-16T19:17:00Z'), log: quiet });

    expect(paidStarts(supabase)).toEqual([W9]);
  });

  it('looks back at most four weeks', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn().mockResolvedValue([]);
    const { weeks } = await runWeeklyXpAwards({
      supabase,
      fetchGains,
      now: new Date('2027-02-02T12:00:00Z'),
      log: quiet,
    });

    expect(weeks).toHaveLength(4);
    expect(fetchGains).toHaveBeenCalledTimes(4);
    expect(supabase.gte).toHaveBeenCalledWith('week_start', weeks[0].week.start.toISOString());
  });

  it('tries every unpaid week, then fails loudly if any failed', async () => {
    const supabase = fakeSupabase();
    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } })
      .mockResolvedValueOnce({ data: 1, error: null });

    await expect(
      runWeeklyXpAwards({ supabase, fetchGains: vi.fn().mockResolvedValue([row(1, 5)]), now: NOW, log: quiet })
    ).rejects.toThrow(/1 week\(s\) could not be paid.*permission denied/);
    // The second week was still paid after the first failed.
    expect(paidStarts(supabase)).toEqual([W9, W16]);
  });
});
