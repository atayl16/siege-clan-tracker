import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';

/**
 * Covers redeem_claim_code() against a real database.
 *
 * Player claiming could never have worked from the browser: claim_codes and
 * player_claims have no policies for authenticated users, so the first read
 * returned nothing and the writes failed with 42501. It cannot be fixed with
 * policies either - a SELECT policy permissive enough to look up your own code
 * by value also lets any signed-in user list every unredeemed code and claim
 * whichever player they like.
 *
 * The enumeration case below is the one that matters most: it is the reason
 * this is an RPC rather than a policy.
 *
 * Skips when no local stack is reachable, so `npm test` passes without Docker.
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

describe.skipIf(!stack)('redeem_claim_code', () => {
  const suffix = Date.now();
  const CLAIMABLE = 900004; // seeded member, unclaimed
  const OTHER = 900005;
  let tokenA;
  let tokenB;

  const svc = {
    apikey: stack?.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${stack?.SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  async function seedCode(code, womId, extra = {}) {
    const res = await fetch(`${stack.API_URL}/rest/v1/claim_codes`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({ code, wom_id: womId, is_claimed: false, ...extra }),
    });
    expect(res.status, await res.text()).toBeLessThan(300);
  }

  /** Sign up and create the matching public.users row, as register() does. */
  async function makeUser(name) {
    const email = `${name}-${suffix}@example.com`;
    const res = await fetch(`${stack.API_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password-not-a-secret' }),
    });
    const session = await res.json();
    expect(session.access_token, JSON.stringify(session)).toBeTruthy();

    await fetch(`${stack.API_URL}/rest/v1/users`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: session.user.id,
        username: `${name}-${suffix}`,
        password_hash: 'not-used-by-this-path',
        is_admin: false,
      }),
    });
    return session.access_token;
  }

  function redeem(token, code) {
    return fetch(`${stack.API_URL}/rest/v1/rpc/redeem_claim_code`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
    }).then((r) => r.json());
  }

  beforeAll(async () => {
    // Claiming is one-way, so a previous run leaves these players claimed and
    // every redemption afterwards fails with "already been claimed" - a real
    // failure for the wrong reason. Reset the fixture rather than depending on
    // a fresh `supabase db reset`.
    for (const womId of [CLAIMABLE, OTHER]) {
      await fetch(`${stack.API_URL}/rest/v1/player_claims?wom_id=eq.${womId}`, {
        method: 'DELETE',
        headers: svc,
      });
    }

    tokenA = await makeUser('claimer-a');
    tokenB = await makeUser('claimer-b');
    await seedCode(`GOOD-${suffix}`, CLAIMABLE);
    await seedCode(`SECOND-${suffix}`, CLAIMABLE);
    await seedCode(`EXPIRED-${suffix}`, OTHER, { expires_at: '2020-01-01T00:00:00Z' });
  }, 30_000);

  it('redeems a valid code and names the player', async () => {
    const out = await redeem(tokenA, `GOOD-${suffix}`);
    expect(out.success, JSON.stringify(out)).toBe(true);
    expect(out.player_name).toBeTruthy();
  });

  it('refuses the same code twice', async () => {
    const out = await redeem(tokenA, `GOOD-${suffix}`);
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/already used/i);
  });

  it('refuses a second user claiming the same player', async () => {
    const out = await redeem(tokenB, `SECOND-${suffix}`);
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/already been claimed/i);
  });

  it('refuses an expired code', async () => {
    const out = await redeem(tokenB, `EXPIRED-${suffix}`);
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/expired/i);
  });

  it('gives the same answer for an unknown code as for a used one', async () => {
    // Identical wording on purpose: a different message would let someone probe
    // which codes exist.
    const unknown = await redeem(tokenB, `NO-SUCH-CODE-${suffix}`);
    expect(unknown.success).toBe(false);
    expect(unknown.error).toMatch(/already used/i);
  });

  it('does not let a signed-in user enumerate claim codes', async () => {
    const res = await fetch(`${stack.API_URL}/rest/v1/claim_codes?select=code`, {
      headers: { apikey: stack.ANON_KEY, Authorization: `Bearer ${tokenB}` },
    });
    expect(await res.json()).toEqual([]);
  });

  it('is not callable without a session', async () => {
    const res = await fetch(`${stack.API_URL}/rest/v1/rpc/redeem_claim_code`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: `GOOD-${suffix}` }),
    });
    // 401 with no Authorization header, 403 for a session lacking the grant.
    // Either is fine; what matters is that anon cannot execute it.
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.success).toBeUndefined();
    expect(body.message).toMatch(/permission denied/i);
  });
});
