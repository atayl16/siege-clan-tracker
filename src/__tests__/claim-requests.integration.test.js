import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

/**
 * Claim requests, from both sides.
 *
 * The member path goes through RLS: you may raise a request in your own name
 * and read your own, and nothing else. The admin path goes through Netlify
 * functions with the service role, because claim_requests_read_own would
 * otherwise hide every other member's request from an admin.
 *
 * Reads used to be `USING (true)` from the staging schema, so anyone with the
 * anon key could read every member's requests including admin_notes. The
 * isolation test below is what keeps that closed.
 */

const require = createRequire(import.meta.url);

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
const CLAIMABLE = 900007;

describe.skipIf(!stack)('claim requests', () => {
  const suffix = Date.now();
  let member;
  let other;
  let adminToken;
  let listHandler;
  let processHandler;
  let supabase;

  async function makeUser(name, { isAdmin = false } = {}) {
    const res = await fetch(`${stack.API_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: stack.ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${name}-${suffix}@example.com`,
        password: 'test-password-not-a-secret',
      }),
    });
    const session = await res.json();
    expect(session.access_token, JSON.stringify(session)).toBeTruthy();

    // is_admin is blocked on insert by users_insert_own_row, so an admin is
    // promoted with the service role, the way a real one would be.
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
        supabase_auth_id: session.user.id,
        is_admin: false,
      }),
    });
    expect(insert.status, await insert.clone().text()).toBeLessThan(300);

    if (isAdmin) {
      await supabase.from('users').update({ is_admin: true }).eq('id', session.user.id);
    }
    return { id: session.user.id, token: session.access_token };
  }

  function asMember(token, path, init = {}) {
    return fetch(`${stack.API_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: stack.ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers || {}),
      },
    });
  }

  function callAdmin(handler, token, body) {
    return handler(
      {
        httpMethod: body ? 'POST' : 'GET',
        headers: { origin: 'http://localhost:8888', authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      },
      {}
    );
  }

  beforeAll(async () => {
    process.env.SUPABASE_URL = stack.API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = stack.SERVICE_ROLE_KEY;
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(stack.API_URL, stack.SERVICE_ROLE_KEY);

    ({ handler: listHandler } = require('../../netlify/functions/admin-claim-requests.cjs'));
    ({ handler: processHandler } = require('../../netlify/functions/admin-process-claim-request.cjs'));

    // Claiming is one-way, so clear anything a previous run left behind.
    await supabase.from('player_claims').delete().eq('wom_id', CLAIMABLE);

    member = await makeUser('requester');
    other = await makeUser('bystander');
    const admin = await makeUser('queue-admin', { isAdmin: true });
    adminToken = admin.token;
  }, 30_000);

  it('lets a member raise a request in their own name', async () => {
    const res = await asMember(member.token, 'claim_requests', {
      method: 'POST',
      body: JSON.stringify({
        user_id: member.id,
        wom_id: CLAIMABLE,
        rsn: 'Smoke Sapphire',
        message: 'this is me',
        status: 'pending',
      }),
    });
    expect(res.status, await res.clone().text()).toBe(201);
  });

  it('refuses a request filed in somebody else name', async () => {
    const res = await asMember(other.token, 'claim_requests', {
      method: 'POST',
      body: JSON.stringify({ user_id: member.id, wom_id: CLAIMABLE, rsn: 'Smoke Sapphire' }),
    });
    expect(res.status).toBe(403);
  });

  it('shows a member only their own requests', async () => {
    const mine = await (await asMember(member.token, 'claim_requests?select=id')).json();
    const theirs = await (await asMember(other.token, 'claim_requests?select=id')).json();
    expect(mine.length).toBeGreaterThan(0);
    expect(theirs).toEqual([]);
  });

  it('shows an admin every request through the function', async () => {
    const res = await callAdmin(listHandler, adminToken);
    expect(res.statusCode, res.body).toBe(200);
    const { data } = JSON.parse(res.body);
    expect(data.length).toBeGreaterThan(0);
  });

  it('refuses the admin list to a non-admin', async () => {
    const res = await callAdmin(listHandler, member.token);
    expect(res.statusCode).toBe(403);
  });

  it('approves a request and creates the player claim', async () => {
    const [request] = await (
      await asMember(member.token, 'claim_requests?select=id,user_id,wom_id')
    ).json();

    const res = await callAdmin(processHandler, adminToken, {
      requestId: request.id,
      action: 'approved',
      adminNotes: 'looks right',
      userId: request.user_id,
      womId: request.wom_id,
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('approved');

    const { data: claims } = await supabase
      .from('player_claims')
      .select('user_id')
      .eq('wom_id', CLAIMABLE);
    expect(claims.map((c) => c.user_id)).toContain(member.id);
  });

  it('refuses to approve a player somebody already claimed', async () => {
    const res = await asMember(other.token, 'claim_requests', {
      method: 'POST',
      body: JSON.stringify({
        user_id: other.id,
        wom_id: CLAIMABLE,
        rsn: 'Smoke Sapphire',
        status: 'pending',
      }),
    });
    const [duplicate] = await res.json();

    const approve = await callAdmin(processHandler, adminToken, {
      requestId: duplicate.id,
      action: 'approved',
      userId: other.id,
      womId: CLAIMABLE,
    });
    // Without this the same player would be handed to two members: the unique
    // constraint on player_claims only covers (user_id, wom_id).
    expect(approve.statusCode).toBe(409);
  });
});
