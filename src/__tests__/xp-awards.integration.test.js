import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

/**
 * award_weekly_xp against a real database (local Supabase).
 *
 * The hourly job offers the same week every hour, so the guarantee that
 * matters is "paid once": the second offer must not add points again. And
 * the function moves Siege Score, so the anon key must not be able to call it.
 */

function localStack() {
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = Object.fromEntries(
      out
        .split('\n')
        .map((l) => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]])
    );
    return env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY ? env : null;
  } catch {
    return null;
  }
}

const stack = localStack();

describe.skipIf(!stack)('award_weekly_xp', () => {
  // A week far from any real one, so reruns and real data never collide.
  const offset = Date.now() % 100000;
  const weekStart = new Date(Date.UTC(2030, 0, 7, 19) + offset * 1000).toISOString();
  const weekEnd = new Date(Date.parse(weekStart) + 7 * 86400000).toISOString();
  const WINNER = 990000 + (offset % 9000);
  const NOT_A_MEMBER = 980000 + (offset % 9000);

  let admin;
  let anon;

  const award = (client, awards) =>
    client.rpc('award_weekly_xp', { p_week_start: weekStart, p_week_end: weekEnd, p_awards: awards });

  const score = async () =>
    (await admin.from('members').select('siege_score').eq('wom_id', WINNER).single()).data.siege_score;

  const awards = [
    { wom_id: WINNER, player_name: 'Xp Winner', placement: 1, xp_gained: 9000000, points_awarded: 15 },
    { wom_id: NOT_A_MEMBER, player_name: 'Not In Clan', placement: 2, xp_gained: 8000000, points_awarded: 10 },
  ];

  beforeAll(async () => {
    admin = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anon = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });
    const { error } = await admin
      .from('members')
      .upsert({ wom_id: WINNER, name: 'Xp Winner', wom_name: 'xp winner', siege_score: 40 });
    if (error) throw error;
  });

  afterAll(async () => {
    await admin.from('xp_awards').delete().eq('week_start', weekStart);
    await admin.from('members').delete().eq('wom_id', WINNER);
  });

  it('refuses the anon key', async () => {
    const { error } = await award(anon, awards);
    expect(error).not.toBeNull();
    expect(await score()).toBe(40);
  });

  it('pays members once, adding to their score, and skips non-members', async () => {
    const first = await award(admin, awards);
    expect(first.error).toBeNull();
    expect(first.data).toBe(1);
    expect(await score()).toBe(55);

    const { data: rows } = await anon.from('xp_awards').select('wom_id, placement, points_awarded').eq('week_start', weekStart);
    expect(rows).toEqual([{ wom_id: WINNER, placement: 1, points_awarded: 15 }]);
  });

  it('is a no-op when the same week is offered again', async () => {
    const again = await award(admin, awards);
    expect(again.error).toBeNull();
    expect(again.data).toBe(0);
    expect(await score()).toBe(55);
  });

  it('does not let the anon key write awards directly', async () => {
    await anon.from('xp_awards').insert({
      week_start: weekEnd, week_end: weekEnd, wom_id: WINNER, player_name: 'x',
      placement: 1, xp_gained: 1, points_awarded: 1000,
    });
    const { data } = await admin.from('xp_awards').select('id').eq('week_start', weekEnd);
    expect(data).toEqual([]);
  });
});
