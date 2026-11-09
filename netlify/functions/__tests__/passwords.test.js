import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  sha256Hex,
  generateTempPassword,
  validateNewPassword,
  resetPassword,
  changeOwnPassword,
  PasswordError,
} = require('../utils/passwords.cjs');

const ROW = { id: 'u-1', username: 'roinrin', password_hash: sha256Hex('old-password'), supabase_auth_id: 'auth-1' };

/** Stand-in service-role client over one users row; records every write. */
function fakeSupabase({ rows = [ROW], authError = null, hashError = null } = {}) {
  const calls = { auth: [], hash: [] };
  return {
    calls,
    auth: {
      admin: {
        updateUserById: vi.fn(async (id, attrs) => {
          calls.auth.push({ id, ...attrs });
          return { error: authError };
        }),
      },
    },
    from: () => {
      const q = { eq: [], or: null, update: null };
      const b = {
        select: () => b,
        limit: () => b,
        eq: (c, v) => (q.eq.push([c, v]), b),
        or: (expr) => ((q.or = expr), b),
        update: (v) => ((q.update = v), b),
        then: (resolve) => {
          if (q.update) {
            calls.hash.push({ values: q.update, eq: q.eq });
            return Promise.resolve({ error: hashError }).then(resolve);
          }
          let data = rows;
          if (q.or) {
            const ids = [...q.or.matchAll(/\.eq\.([^,]+)/g)].map((m) => m[1]);
            data = data.filter((r) => ids.includes(r.id) || ids.includes(r.supabase_auth_id));
          }
          for (const [c, v] of q.eq) data = data.filter((r) => r[c] === v);
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return b;
    },
  };
}

describe('generateTempPassword', () => {
  it('makes long, unambiguous, different passwords', () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).toMatch(/^[a-hj-km-np-z2-9]{4}(-[a-hj-km-np-z2-9]{4}){3}$/);
    expect(a).not.toBe(b);
  });
});

describe('validateNewPassword', () => {
  it.each([['short', false], ['long enough', true], ['x'.repeat(73), false]])('%s -> ok=%s', (pw, ok) => {
    expect(validateNewPassword(pw) === null).toBe(ok);
  });
});

describe('resetPassword', () => {
  it('sets the same new password in Supabase Auth and as the users hash, and returns it', async () => {
    const supabase = fakeSupabase();
    const { username, temporaryPassword } = await resetPassword(supabase, 'u-1');

    expect(username).toBe('roinrin');
    expect(supabase.calls.auth).toEqual([{ id: 'auth-1', password: temporaryPassword }]);
    expect(supabase.calls.hash).toEqual([
      { values: { password_hash: sha256Hex(temporaryPassword) }, eq: [['id', 'u-1']] },
    ]);
  });

  it('uses the row id as the auth id when supabase_auth_id is empty', async () => {
    const supabase = fakeSupabase({ rows: [{ ...ROW, supabase_auth_id: null }] });
    await resetPassword(supabase, 'u-1');
    expect(supabase.calls.auth[0].id).toBe('u-1');
  });

  it('changes nothing if Supabase Auth refuses', async () => {
    const supabase = fakeSupabase({ authError: { message: 'User not found' } });
    await expect(resetPassword(supabase, 'u-1')).rejects.toThrow(/login password: User not found/);
    expect(supabase.calls.hash).toHaveLength(0);
  });

  it('refuses an unknown user', async () => {
    const err = await resetPassword(fakeSupabase(), 'nobody').catch((e) => e);
    expect(err).toBeInstanceOf(PasswordError);
    expect(err.statusCode).toBe(404);
  });
});

describe('changeOwnPassword', () => {
  const caller = { id: 'auth-1' };

  it('changes the password when the current one is right', async () => {
    const supabase = fakeSupabase();
    await changeOwnPassword(supabase, caller, 'old-password', 'brand-new-pass');
    expect(supabase.calls.auth).toEqual([{ id: 'auth-1', password: 'brand-new-pass' }]);
    expect(supabase.calls.hash[0].values).toEqual({ password_hash: sha256Hex('brand-new-pass') });
  });

  it.each([
    ['a wrong current password', 'not-it', 'brand-new-pass', 403],
    ['a too-short new password', 'old-password', 'short', 400],
    ['the same password again', 'old-password', 'old-password', 400],
  ])('refuses %s and writes nothing', async (_label, current, next, status) => {
    const supabase = fakeSupabase();
    const err = await changeOwnPassword(supabase, caller, current, next).catch((e) => e);
    expect(err.statusCode).toBe(status);
    expect(supabase.calls.auth).toHaveLength(0);
    expect(supabase.calls.hash).toHaveLength(0);
  });
});

describe('the built-in admin account', () => {
  const adminRow = { id: 'a-1', username: 'admin', password_hash: '', supabase_auth_id: null };

  it('cannot have its password reset by an admin', async () => {
    const supabase = fakeSupabase({ rows: [adminRow] });
    const err = await resetPassword(supabase, 'a-1').catch((e) => e);
    expect(err.statusCode).toBe(403);
    expect(supabase.calls.auth).toHaveLength(0);
    expect(supabase.calls.hash).toHaveLength(0);
  });

  it('cannot change its own password either', async () => {
    const supabase = fakeSupabase({ rows: [adminRow] });
    const err = await changeOwnPassword(supabase, { id: 'a-1' }, '', 'some-new-password').catch((e) => e);
    expect(err.statusCode).toBe(403);
    expect(supabase.calls.auth).toHaveLength(0);
  });
});
