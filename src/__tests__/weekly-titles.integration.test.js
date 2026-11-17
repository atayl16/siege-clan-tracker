import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

/**
 * award_weekly_titles and set_weekly_title_standings against a real database
 * (local Supabase).
 *
 * The hourly job offers the same week every hour, so a week must be awarded
 * once only, including a week where nobody qualified. Members can win several
 * titles in one week, so their points must add up. Both functions write, so
 * the anon key must not be able to call them.
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

describe.skipIf(!stack)('weekly titles database functions', () => {
  const offset = Date.now() % 100000;
  // Weeks far from any real one, so reruns and real data never collide.
  const week = (n) => new Date(Date.UTC(2031, 0, 6 + 7 * n, 19) + offset * 1000).toISOString();
  const A = 970000 + (offset % 9000);
  const B = A + 1;
  const NOT_A_MEMBER = 960000 + (offset % 9000);

  let admin;
  let anon;

  const score = async (id) =>
    (await admin.from('members').select('siege_score').eq('wom_id', id).single()).data.siege_score;

  const award = (client, start, awards) =>
    client.rpc('award_weekly_titles', { p_week_start: start, p_week_end: week(9), p_awards: awards });

  const placing = (title, wom_id, placement, points_awarded) => ({
    title,
    wom_id,
    player_name: `p${wom_id}`,
    placement,
    value: 10,
    points_awarded,
  });

  beforeAll(async () => {
    admin = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anon = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });
    const { error } = await admin.from('members').upsert([
      { wom_id: A, name: 'Title A', wom_name: 'title a', siege_score: 1000 },
      { wom_id: B, name: 'Title B', wom_name: 'title b', siege_score: 500 },
    ]);
    if (error) throw error;
  });

  afterAll(async () => {
    for (const n of [0, 1]) {
      await admin.from('weekly_title_awards').delete().eq('week_start', week(n));
      await admin.from('weekly_title_weeks').delete().eq('week_start', week(n));
    }
    await admin.from('weekly_title_standings').delete().in('wom_id', [A, B]);
    await admin.from('members').delete().in('wom_id', [A, B]);
  });

  it('refuses the anon key for both functions', async () => {
    const a = await award(anon, week(0), [placing('warrior', A, 1, 150)]);
    const s = await anon.rpc('set_weekly_title_standings', { p_week_start: week(0), p_rows: [] });
    expect(a.error).not.toBeNull();
    expect(s.error).not.toBeNull();
    expect(await score(A)).toBe(1000);
  });

  it('adds up a member\'s points across titles, and skips non-members', async () => {
    const { data, error } = await award(admin, week(0), [
      placing('warrior', A, 1, 150),
      placing('clogger', A, 3, 50),
      placing('warrior', B, 2, 100),
      placing('warrior', NOT_A_MEMBER, 3, 50),
    ]);
    expect(error).toBeNull();
    expect(data).toBe(2); // two members' scores changed
    expect(await score(A)).toBe(1200);
    expect(await score(B)).toBe(600);

    const { data: rows } = await anon
      .from('weekly_title_awards')
      .select('title, wom_id, points_awarded')
      .eq('week_start', week(0))
      .order('points_awarded', { ascending: false });
    expect(rows.map((r) => r.wom_id)).not.toContain(NOT_A_MEMBER);
    expect(rows).toHaveLength(3);
  });

  it('is a no-op when the same week is offered again', async () => {
    const { data, error } = await award(admin, week(0), [placing('warrior', A, 1, 150)]);
    expect(error).toBeNull();
    expect(data).toBe(0);
    expect(await score(A)).toBe(1200);
  });

  it('records a week where nobody qualified, so it is not offered forever', async () => {
    const first = await award(admin, week(1), []);
    expect(first.error).toBeNull();
    const { data: done } = await anon.from('weekly_title_weeks').select('awards').eq('week_start', week(1)).single();
    expect(done.awards).toBe(0);
    const again = await award(admin, week(1), [placing('warrior', A, 1, 150)]);
    expect(again.data).toBe(0);
    expect(await score(A)).toBe(1200);
  });

  it('replaces the live standings on every write', async () => {
    const write = (rows) => admin.rpc('set_weekly_title_standings', { p_week_start: week(2), p_rows: rows });
    await write([
      { title: 'warrior', wom_id: A, player_name: 'Title A', value: 3.5 },
      { title: 'warrior', wom_id: B, player_name: 'Title B', value: 2 },
    ]);
    const second = await write([{ title: 'clogger', wom_id: A, player_name: 'Title A', value: 7 }]);
    expect(second.error).toBeNull();

    const { data } = await anon.from('weekly_title_standings').select('title, wom_id, value').in('wom_id', [A, B]);
    expect(data).toEqual([{ title: 'clogger', wom_id: A, value: 7 }]);
  });

  it('does not let the anon key write any of the tables', async () => {
    await anon.from('weekly_title_awards').insert({
      week_start: week(0), week_end: week(9), title: 'x', wom_id: A, player_name: 'x',
      placement: 1, value: 1, points_awarded: 1000,
    });
    await anon.from('weekly_title_standings').insert({ week_start: week(5), title: 'x', wom_id: A, player_name: 'x', value: 1 });
    const { data: awards } = await admin.from('weekly_title_awards').select('id').eq('title', 'x');
    const { data: standings } = await admin.from('weekly_title_standings').select('wom_id').eq('title', 'x');
    expect(awards).toEqual([]);
    expect(standings).toEqual([]);
  });
});
