import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renameUser, validateUsername, RenameError, RenameStepError } = require('../utils/renameUser.cjs');

const AUTH_USER = { id: 'auth-1', email: 'roin@example.com' };

/**
 * A stand-in for the service-role client. `users` is the table; every query
 * is recorded so tests can check what was written.
 */
function fakeSupabase({ users, authUpdateError = null, rowUpdateError = null }) {
  const calls = { authUpdates: [], rowUpdates: [] };
  const from = () => {
    const q = { filters: [], or: null, update: null };
    const builder = {
      select() { return builder; },
      or(expr) { q.or = expr; return builder; },
      eq(col, val) { q.filters.push([col, val]); return builder; },
      limit() { return builder; },
      update(values) { q.update = values; return builder; },
      then(resolve) {
        if (q.update) {
          calls.rowUpdates.push({ values: q.update, filters: q.filters });
          return Promise.resolve({ error: rowUpdateError }).then(resolve);
        }
        let rows = users;
        if (q.or) {
          const ids = [...q.or.matchAll(/\.eq\.([^,]+)/g)].map((m) => m[1]);
          rows = rows.filter((u) => ids.includes(u.id) || ids.includes(u.supabase_auth_id));
        }
        for (const [col, val] of q.filters) rows = rows.filter((u) => u[col] === val);
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return builder;
  };
  return {
    from,
    calls,
    auth: {
      admin: {
        updateUserById: vi.fn(async (id, attrs) => {
          calls.authUpdates.push({ id, ...attrs });
          // Only the first update (the rename) fails when asked to.
          return { error: calls.authUpdates.length === 1 ? authUpdateError : null };
        }),
      },
    },
  };
}

const users = () => [
  { id: 'auth-1', supabase_auth_id: 'auth-1', username: 'roin' },
  { id: 'u-2', supabase_auth_id: 'auth-2', username: 'dan' },
];

describe('validateUsername', () => {
  it.each(['abc', 'roin_rin', 'r.o-n9', 'a'.repeat(24)])('accepts %s', (name) => {
    expect(validateUsername(name)).toBeNull();
  });
  it.each(['ab', 'a'.repeat(25), 'has space', '_lead', 'trail-', 'ümlaut', 'semi;colon'])(
    'rejects %s',
    (name) => {
      expect(validateUsername(name)).not.toBeNull();
    }
  );
});

describe('renameUser', () => {
  let supabase;
  beforeEach(() => {
    supabase = fakeSupabase({ users: users() });
  });

  it('changes the login email, then the username, for the caller only', async () => {
    const result = await renameUser({ supabase, authUser: AUTH_USER, newUsername: '  Clan_Main ' });

    expect(result).toEqual({ username: 'clan_main' });
    expect(supabase.calls.authUpdates).toEqual([
      { id: 'auth-1', email: 'clan_main@example.com', email_confirm: true },
    ]);
    expect(supabase.calls.rowUpdates).toEqual([
      { values: { username: 'clan_main' }, filters: [['id', 'auth-1']] },
    ]);
  });

  it('finds an account linked through supabase_auth_id', async () => {
    await renameUser({ supabase, authUser: { id: 'auth-2', email: 'dan@example.com' }, newUsername: 'danny' });
    expect(supabase.calls.rowUpdates[0].filters).toEqual([['id', 'u-2']]);
  });

  it.each([
    ['an invalid name', 'no spaces', 400],
    ['the current name', 'roin', 400],
    ['a name another user has', 'dan', 409],
    ['the reserved name admin', 'Admin', 400],
  ])('refuses %s without changing anything', async (_label, newUsername, status) => {
    const err = await renameUser({ supabase, authUser: AUTH_USER, newUsername }).catch((e) => e);
    expect(err).toBeInstanceOf(RenameError);
    expect(err.statusCode).toBe(status);
    expect(supabase.calls.authUpdates).toHaveLength(0);
    expect(supabase.calls.rowUpdates).toHaveLength(0);
  });

  it('refuses the built-in admin login', async () => {
    const err = await renameUser({
      supabase,
      authUser: { id: 'auth-9', email: 'admin@siegeclan.org' },
      newUsername: 'boss',
    }).catch((e) => e);
    expect(err.statusCode).toBe(403);
    expect(supabase.calls.authUpdates).toHaveLength(0);
  });

  it('reports a name whose login email another auth account holds as taken', async () => {
    supabase = fakeSupabase({
      users: users(),
      authUpdateError: { message: 'A user with this email address has already been registered' },
    });
    const err = await renameUser({ supabase, authUser: AUTH_USER, newUsername: 'ghost' }).catch((e) => e);
    expect(err.statusCode).toBe(409);
    expect(supabase.calls.rowUpdates).toHaveLength(0);
  });

  it('recognises Supabase Auth\'s email_exists error as a taken name, whatever its wording', async () => {
    supabase = fakeSupabase({
      users: users(),
      authUpdateError: { status: 422, code: 'email_exists', message: 'Unprocessable' },
    });
    const err = await renameUser({ supabase, authUser: AUTH_USER, newUsername: 'roinrin' }).catch((e) => e);
    expect(err).toBeInstanceOf(RenameError);
    expect(err.statusCode).toBe(409);
  });

  it('puts the login email back if the username cannot be saved', async () => {
    supabase = fakeSupabase({ users: users(), rowUpdateError: { code: '23505', message: 'duplicate' } });
    const err = await renameUser({ supabase, authUser: AUTH_USER, newUsername: 'racer' }).catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(supabase.calls.authUpdates).toEqual([
      { id: 'auth-1', email: 'racer@example.com', email_confirm: true },
      { id: 'auth-1', email: 'roin@example.com', email_confirm: true },
    ]);
  });

  it('labels an unexpected auth failure with the step it happened in', async () => {
    supabase = fakeSupabase({ users: users(), authUpdateError: { message: 'Database error updating user' } });
    const err = await renameUser({ supabase, authUser: AUTH_USER, newUsername: 'racer' }).catch((e) => e);

    expect(err).toBeInstanceOf(RenameStepError);
    expect(err.message).toBe('updating your login email: Database error updating user');
    expect(supabase.calls.rowUpdates).toHaveLength(0);
  });
});
