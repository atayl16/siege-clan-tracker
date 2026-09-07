import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

/**
 * End-to-end cover for the admin write path: a real Supabase JWT, the real
 * handler, the real admin_update_member RPC, and a real Postgres row.
 *
 * Two separate bugs have broken adding siege points, and neither was visible
 * to the suite. In April the RPC silently ignored most of the fields it was
 * handed; in September the function 502'd before the handler ran. The unit
 * tests mock Supabase, so they pass either way. This asserts the score
 * actually changed in the database.
 *
 * Requires the local Supabase stack (`supabase start`). Skips when it is not
 * running so `npm test` still works without Docker - the smoke workflow is
 * where this gets a stack in CI.
 */

const require = createRequire(import.meta.url);

/** Read local stack credentials, or null when the stack is down. */
function localStack() {
  try {
    const out = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = Object.fromEntries(
      out
        .split('\n')
        .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]])
    );
    if (!env.API_URL || !env.SERVICE_ROLE_KEY || !env.ANON_KEY) return null;
    return env;
  } catch {
    return null;
  }
}

const stack = localStack();
const SEEDED_MEMBER = 900001; // Smoke Owner, seeded with siege_score 100

describe.skipIf(!stack)('admin-update-member against a real database', () => {
  let handler;
  let adminToken;
  let plainToken;
  let supabase;
  const created = [];
  const suffix = Date.now();

  /**
   * Create an auth user plus its public.users row, and return a real JWT.
   *
   * Uses the public signup endpoint rather than /auth/v1/admin/users: the CLI
   * issues newer-format keys, and SERVICE_ROLE_KEY is accepted by PostgREST but
   * rejected by GoTrue ("signing method HS256 is invalid"). Signup needs only
   * the anon key, and config.toml sets enable_confirmations = false, so the
   * response carries a session already.
   */
  async function makeUser({ isAdmin }) {
    const email = `${isAdmin ? 'admin' : 'plain'}-${suffix}@example.test`;
    const password = 'test-password-not-a-secret';

    const res = await fetch(`${stack.API_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const session = await res.json();
    expect(res.status, JSON.stringify(session)).toBe(200);
    expect(session.access_token, JSON.stringify(session)).toBeTruthy();
    created.push(session.user.id);

    // validateAuth looks the caller up by supabase_auth_id and checks is_admin.
    const { error } = await supabase.from('users').insert({
      username: `${isAdmin ? 'admin' : 'plain'}-${suffix}`,
      password_hash: 'not-used-by-this-path',
      is_admin: isAdmin,
      supabase_auth_id: session.user.id,
    });
    expect(error).toBeNull();

    return session.access_token;
  }

  function call(token, body) {
    return handler(
      {
        httpMethod: 'POST',
        headers: {
          origin: 'http://localhost:8888',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      },
      {}
    );
  }

  beforeAll(async () => {
    // The handler builds its Supabase client at module load, so point it at
    // the local stack before requiring it.
    process.env.SUPABASE_URL = stack.API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = stack.SERVICE_ROLE_KEY;
    process.env.SUPABASE_ANON_KEY = stack.ANON_KEY;

    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY);
    ({ handler } = require('../admin-update-member.cjs'));

    adminToken = await makeUser({ isAdmin: true });
    plainToken = await makeUser({ isAdmin: false });
  }, 30_000);

  afterAll(async () => {
    if (!supabase) return;
    // Only the public.users rows are cleaned up. Removing the auth.users rows
    // needs the GoTrue admin API, which this key cannot reach; they are
    // throwaway accounts in a local stack that db reset rebuilds anyway.
    for (const id of created) {
      await supabase.from('users').delete().eq('supabase_auth_id', id);
    }
  });

  // The regression that started this: the score has to actually move.
  it('writes a new siege_score all the way to the database', async () => {
    const { data: before } = await supabase
      .from('members')
      .select('siege_score')
      .eq('wom_id', SEEDED_MEMBER)
      .single();

    const target = (before.siege_score ?? 0) + 2;
    const res = await call(adminToken, {
      memberId: SEEDED_MEMBER,
      updatedData: { wom_id: SEEDED_MEMBER, siege_score: target },
    });
    expect(res.statusCode, res.body).toBe(200);

    const { data: after } = await supabase
      .from('members')
      .select('siege_score')
      .eq('wom_id', SEEDED_MEMBER)
      .single();
    expect(after.siege_score).toBe(target);
  });

  // The April bug: the RPC accepted the call and dropped most of the fields.
  //
  // The targets must differ from whatever is already stored, or a version of
  // the RPC that ignores these fields still passes on values left behind by an
  // earlier run. Deriving them from the current row is what makes this a real
  // check rather than a coincidence.
  it('persists fields other than siege_score in the same call', async () => {
    const { data: before } = await supabase
      .from('members')
      .select('ehb, current_lvl')
      .eq('wom_id', SEEDED_MEMBER)
      .single();

    const targetEhb = Number(before.ehb ?? 0) + 1;
    const targetLvl = Number(before.current_lvl ?? 0) + 1;

    const res = await call(adminToken, {
      memberId: SEEDED_MEMBER,
      updatedData: {
        wom_id: SEEDED_MEMBER,
        ehb: targetEhb,
        current_lvl: targetLvl,
      },
    });
    expect(res.statusCode, res.body).toBe(200);

    const { data: after } = await supabase
      .from('members')
      .select('ehb, current_lvl')
      .eq('wom_id', SEEDED_MEMBER)
      .single();
    expect(Number(after.ehb)).toBe(targetEhb);
    expect(Number(after.current_lvl)).toBe(targetLvl);
  });

  it('rejects a signed-in user who is not an admin', async () => {
    const res = await call(plainToken, {
      memberId: SEEDED_MEMBER,
      updatedData: { wom_id: SEEDED_MEMBER, siege_score: 99999 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects a garbage token', async () => {
    const res = await call('not-a-real-jwt', {
      memberId: SEEDED_MEMBER,
      updatedData: { wom_id: SEEDED_MEMBER, siege_score: 99999 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('leaves the score untouched when the caller is rejected', async () => {
    const { data } = await supabase
      .from('members')
      .select('siege_score')
      .eq('wom_id', SEEDED_MEMBER)
      .single();
    expect(data.siege_score).not.toBe(99999);
  });
});
