import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

/**
 * remove_departed_member against a real database (local Supabase).
 *
 * The hourly sync calls it for members who left the WOM group 7+ days ago.
 * The delete cannot be undone, so the function re-checks the rule itself:
 * anyone not marked as left, or marked less than 7 days ago, must survive
 * whatever the caller asks. A deleted member's claims, claim codes, claim
 * requests and goals go with them; history rows that name them stay.
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

describe.skipIf(!stack)('remove_departed_member', () => {
  // Ranges no other integration test or seed row uses (they run in parallel).
  const offset = Date.now() % 9000;
  const DEPARTED = 930000 + offset;
  const RECENT = 920000 + offset;
  const CURRENT = 910000 + offset;
  const REACTIVATED = 890000 + offset;
  const ALL = [DEPARTED, RECENT, CURRENT, REACTIVATED];
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  let admin;
  let anon;
  let userId;

  const remove = (client, womId) => client.rpc('remove_departed_member', { p_wom_id: womId });
  const count = async (table, womId) => {
    const { count: n, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('wom_id', womId);
    if (error) throw error;
    return n;
  };

  beforeAll(async () => {
    admin = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anon = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });

    const member = (wom_id, name, over) => ({ wom_id, name, wom_name: name.toLowerCase(), siege_score: 50, ...over });
    const { error: membersError } = await admin.from('members').upsert([
      member(DEPARTED, 'Departed Tester', { active: false, left_date: daysAgo(8) }),
      member(RECENT, 'Recent Leaver', { active: false, left_date: daysAgo(6) }),
      member(CURRENT, 'Current Tester', { active: true, left_date: null }),
      member(REACTIVATED, 'Reactivated Tester', { active: true, left_date: daysAgo(30) }),
    ]);
    if (membersError) throw membersError;

    const { data: user, error: userError } = await admin
      .from('users')
      .insert({ username: `departed_test_${offset}`, password_hash: 'not-a-real-hash' })
      .select('id')
      .single();
    if (userError) throw userError;
    userId = user.id;

    for (const wom_id of ALL) {
      const rows = [
        ['player_claims', { user_id: userId, wom_id }],
        ['claim_codes', { code: `departed-test-${offset}-${wom_id}`, wom_id }],
        ['claim_requests', { user_id: userId, wom_id, status: 'pending' }],
        ['user_goals', { user_id: userId, wom_id, goal_type: 'skill', metric: 'attack', target_value: 1000 }],
      ];
      for (const [table, row] of rows) {
        const { error } = await admin.from(table).insert(row);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    }
  });

  afterAll(async () => {
    if (!admin) return;
    for (const table of ['player_claims', 'claim_codes', 'claim_requests', 'user_goals']) {
      await admin.from(table).delete().in('wom_id', ALL);
    }
    await admin.from('members').delete().in('wom_id', ALL);
    await admin.from('siege_score_changes').delete().in('wom_id', ALL);
    if (userId) await admin.from('users').delete().eq('id', userId);
  });

  it('refuses the anon key', async () => {
    const { error } = await remove(anon, DEPARTED);
    expect(error).not.toBeNull();
    expect(await count('members', DEPARTED)).toBe(1);
  });

  it('keeps anyone not marked as left 7+ days ago, and everything that is theirs', async () => {
    for (const womId of [RECENT, CURRENT, REACTIVATED, 1]) {
      const { data, error } = await remove(admin, womId);
      expect(error).toBeNull();
      expect(data).toBe(false);
    }
    for (const womId of [RECENT, CURRENT, REACTIVATED]) {
      for (const table of ['members', 'player_claims', 'claim_codes', 'claim_requests', 'user_goals']) {
        expect(await count(table, womId), `${table} for ${womId}`).toBe(1);
      }
    }
  });

  it('deletes a member gone 7+ days with their claims, codes, requests and goals', async () => {
    const { data, error } = await remove(admin, DEPARTED);
    expect(error).toBeNull();
    expect(data).toBe(true);
    for (const table of ['members', 'player_claims', 'claim_codes', 'claim_requests', 'user_goals']) {
      expect(await count(table, DEPARTED), table).toBe(0);
    }
  });

  it('keeps their history', async () => {
    // Inserting the member with 50 points logged a Siege Score change.
    expect(await count('siege_score_changes', DEPARTED)).toBeGreaterThan(0);
  });

  it('returns false the second time, with nothing left to delete', async () => {
    const { data, error } = await remove(admin, DEPARTED);
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
