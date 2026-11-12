import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runWeeklyXpAwards } = require('../weekly-xp-awards.cjs');

const row = (id, gained, name = `p${id}`) => ({
  player: { id, username: name.toLowerCase(), displayName: name },
  data: { gained },
});

/** Just enough of supabase-js for the job: two reads and one RPC. */
function fakeSupabase({ paidWeeks = [], memberIds = [1, 2, 3, 4, 5, 6], rpcResult = 5 } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
  return {
    rpc,
    from(table) {
      if (table === 'xp_awards') {
        return {
          select: () => ({
            eq: (_col, weekStart) => ({
              limit: async () => ({
                data: paidWeeks.includes(weekStart) ? [{ id: 1 }] : [],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'members') {
        return { select: async () => ({ data: memberIds.map((wom_id) => ({ wom_id })), error: null }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

// Tuesday after the week of 16-23 Nov closed.
const NOW = new Date('2026-11-24T10:00:00Z');
const WEEK_START = '2026-11-16T19:00:00.000Z';
const WEEK_END = '2026-11-23T19:00:00.000Z';
const quiet = () => {};

describe('runWeeklyXpAwards', () => {
  it('pays the top five members for the week that just closed', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn().mockResolvedValue([
      row(1, 9_000_000), row(2, 8_000_000), row(3, 7_000_000),
      row(4, 6_000_000), row(5, 5_000_000), row(6, 4_000_000),
    ]);

    const result = await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    expect(result.status).toBe('paid');
    expect(fetchGains).toHaveBeenCalledWith(new Date(WEEK_START), new Date(WEEK_END));
    expect(supabase.rpc).toHaveBeenCalledWith('award_weekly_xp', {
      p_week_start: WEEK_START,
      p_week_end: WEEK_END,
      p_awards: [
        { wom_id: 1, player_name: 'p1', placement: 1, xp_gained: 9_000_000, points_awarded: 15 },
        { wom_id: 2, player_name: 'p2', placement: 2, xp_gained: 8_000_000, points_awarded: 10 },
        { wom_id: 3, player_name: 'p3', placement: 3, xp_gained: 7_000_000, points_awarded: 5 },
        { wom_id: 4, player_name: 'p4', placement: 4, xp_gained: 6_000_000, points_awarded: 2 },
        { wom_id: 5, player_name: 'p5', placement: 5, xp_gained: 5_000_000, points_awarded: 2 },
      ],
    });
  });

  it('skips players with no members row, so the next one is paid instead', async () => {
    const supabase = fakeSupabase({ memberIds: [2, 3] });
    const fetchGains = vi.fn().mockResolvedValue([row(99, 9e6), row(2, 8e6), row(3, 7e6)]);

    await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    const awards = supabase.rpc.mock.calls[0][1].p_awards;
    expect(awards.map((a) => [a.wom_id, a.placement, a.points_awarded])).toEqual([
      [2, 1, 15],
      [3, 2, 10],
    ]);
  });

  it('does nothing for a week already paid, without calling WOM', async () => {
    const supabase = fakeSupabase({ paidWeeks: [WEEK_START] });
    const fetchGains = vi.fn();

    const result = await runWeeklyXpAwards({ supabase, fetchGains, now: NOW, log: quiet });

    expect(result.status).toBe('already_paid');
    expect(fetchGains).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('leaves the week unpaid when WOM shows no gains, so a later run can pay it', async () => {
    const supabase = fakeSupabase();
    const result = await runWeeklyXpAwards({
      supabase,
      fetchGains: vi.fn().mockResolvedValue([row(1, 0)]),
      now: NOW,
      log: quiet,
    });

    expect(result.status).toBe('no_gains');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('never pays a week from before the award started', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn();
    // During the first week: the last completed one is 2-9 Nov.
    const result = await runWeeklyXpAwards({
      supabase,
      fetchGains,
      now: new Date('2026-11-12T12:00:00Z'),
      log: quiet,
    });

    expect(result.status).toBe('before_start');
    expect(fetchGains).not.toHaveBeenCalled();
  });

  it('pays the first week (9-16 Nov) once it closes', async () => {
    const supabase = fakeSupabase();
    const fetchGains = vi.fn().mockResolvedValue([row(1, 100)]);
    const result = await runWeeklyXpAwards({
      supabase,
      fetchGains,
      now: new Date('2026-11-16T19:17:00Z'),
      log: quiet,
    });

    expect(result.status).toBe('paid');
    expect(supabase.rpc.mock.calls[0][1].p_week_start).toBe('2026-11-09T19:00:00.000Z');
  });

  it('fails loudly when the RPC fails', async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    await expect(
      runWeeklyXpAwards({ supabase, fetchGains: vi.fn().mockResolvedValue([row(1, 5)]), now: NOW, log: quiet })
    ).rejects.toThrow(/permission denied/);
  });
});
