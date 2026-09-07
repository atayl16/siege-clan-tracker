import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';

/**
 * Covers the RLS policies behind race creation (20260907000009).
 *
 * races and race_participants had service_role policies and a public read on
 * races, and no INSERT for authenticated - so the Create Race form could never
 * have worked from a browser, the same shape of problem as registration and
 * claiming. These assert both halves: a member can create their own race, and
 * cannot create or populate someone else's.
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

describe.skipIf(!stack)('race creation policies', () => {
  const suffix = Date.now();
  let alice;
  let bob;

  async function makeUser(name) {
    const email = `${name}-${suffix}@example.com`;
    const res = await fetch(`${stack.API_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test-password-not-a-secret' }),
    });
    const session = await res.json();
    expect(session.access_token, JSON.stringify(session)).toBeTruthy();

    const insert = await fetch(`${stack.API_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: stack.ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: session.user.id,
        username: `${name}-${suffix}`,
        password_hash: 'not-used-by-this-path',
        is_admin: false,
      }),
    });
    expect(insert.status, await insert.clone().text()).toBeLessThan(300);

    return { id: session.user.id, token: session.access_token };
  }

  function post(path, token, body, prefer = 'return=representation') {
    return fetch(`${stack.API_URL}/rest/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: stack.ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    alice = await makeUser('alice');
    bob = await makeUser('bob');
  }, 30_000);

  it('lets a member create a race in their own name', async () => {
    const res = await post('races', alice.token, {
      creator_id: alice.id,
      title: `Alice race ${suffix}`,
      description: 'created by the owner',
      public: true,
      status: 'active',
    });
    expect(res.status, await res.clone().text()).toBe(201);
    const [race] = await res.json();
    expect(race.creator_id).toBe(alice.id);
  });

  it('refuses a race attributed to somebody else', async () => {
    const res = await post('races', bob.token, {
      creator_id: alice.id, // Bob claiming Alice created it
      title: `Forged race ${suffix}`,
    });
    expect(res.status).toBe(403);
    expect((await res.text()).toLowerCase()).toContain('row-level security');
  });

  it('lets the creator add participants to their own race', async () => {
    const created = await post('races', alice.token, {
      creator_id: alice.id,
      title: `Alice participants ${suffix}`,
      public: true,
      status: 'active',
    });
    const [race] = await created.json();

    const res = await post('race_participants', alice.token, {
      race_id: race.id,
      wom_id: 900006,
      player_name: 'Smoke Zenyte',
      metric: 'overall',
      target_value: 1000,
      start_value: 0,
      current_value: 0,
    });
    expect(res.status, await res.clone().text()).toBe(201);
  });

  it("refuses participants on somebody else's race", async () => {
    const created = await post('races', alice.token, {
      creator_id: alice.id,
      title: `Alice private ${suffix}`,
      public: false,
      status: 'active',
    });
    const [race] = await created.json();

    const res = await post('race_participants', bob.token, {
      race_id: race.id,
      wom_id: 900006,
      player_name: 'Smoke Zenyte',
      metric: 'overall',
      target_value: 1000,
      start_value: 0,
      current_value: 0,
    });
    expect(res.status).toBe(403);
  });

  it('hides participants of a private race from other members', async () => {
    const created = await post('races', alice.token, {
      creator_id: alice.id,
      title: `Alice hidden ${suffix}`,
      public: false,
      status: 'active',
    });
    const [race] = await created.json();
    await post('race_participants', alice.token, {
      race_id: race.id,
      wom_id: 900011,
      player_name: 'Smoke TzKal',
      metric: 'overall',
      target_value: 5000,
      start_value: 0,
      current_value: 0,
    });

    const asBob = await fetch(
      `${stack.API_URL}/rest/v1/race_participants?select=id&race_id=eq.${race.id}`,
      { headers: { apikey: stack.ANON_KEY, Authorization: `Bearer ${bob.token}` } }
    );
    expect(await asBob.json()).toEqual([]);

    const asAlice = await fetch(
      `${stack.API_URL}/rest/v1/race_participants?select=id&race_id=eq.${race.id}`,
      { headers: { apikey: stack.ANON_KEY, Authorization: `Bearer ${alice.token}` } }
    );
    expect((await asAlice.json()).length).toBe(1);
  });
});
