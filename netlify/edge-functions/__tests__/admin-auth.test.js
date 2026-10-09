import { describe, it, expect, vi } from 'vitest';
import { getCaller, requireAdmin } from '../_shared/auth.js';

const request = (authorization) =>
  new Request('https://www.siege-clan.com/api/users', {
    headers: authorization ? { Authorization: authorization } : {},
  });

/** A service-role client stand-in: a token resolves to an auth user, and that
 * user's users row decides admin. */
function fakeSupabase({ authUser = { id: 'auth-1' }, authError = null, row = null, dbError = null } = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: dbError });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: authError }),
    },
    from: vi.fn(() => ({ select })),
    _eq: eq,
  };
}

describe('getCaller', () => {
  it('is anonymous without an Authorization header', async () => {
    const supabase = fakeSupabase();
    expect(await getCaller(request(), supabase)).toEqual({ role: 'anonymous' });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('rejects a non-bearer header', async () => {
    const { error } = await getCaller(request('Basic abc'), fakeSupabase());
    expect(error.status).toBe(401);
  });

  it('rejects a token Supabase does not recognise', async () => {
    const supabase = fakeSupabase({ authUser: null, authError: { message: 'bad jwt' } });
    const { error } = await getCaller(request('Bearer forged'), supabase);
    expect(error.status).toBe(401);
  });

  it('is admin when the linked users row says so', async () => {
    const supabase = fakeSupabase({ row: { is_admin: true } });
    expect(await getCaller(request('Bearer good'), supabase)).toEqual({ role: 'admin' });
    expect(supabase.auth.getUser).toHaveBeenCalledWith('good');
    expect(supabase._eq).toHaveBeenCalledWith('supabase_auth_id', 'auth-1');
  });

  it('is a plain user when the row is not admin, or there is no linked row', async () => {
    expect(await getCaller(request('Bearer t'), fakeSupabase({ row: { is_admin: false } })))
      .toEqual({ role: 'user' });
    expect(await getCaller(request('Bearer t'), fakeSupabase({ row: null })))
      .toEqual({ role: 'user' });
  });

  it('fails closed when the users lookup errors', async () => {
    const supabase = fakeSupabase({ dbError: { message: 'boom' } });
    const { error } = await getCaller(request('Bearer t'), supabase);
    expect(error.status).toBe(401);
  });
});

describe('requireAdmin', () => {
  it('returns 401 for an anonymous caller, however the Origin is set', async () => {
    // The original hole: a forged Origin was the whole of the check.
    const forged = new Request('https://www.siege-clan.com/api/users', {
      headers: { Origin: 'https://www.siege-clan.com' },
    });
    const res = await requireAdmin(forged, fakeSupabase());
    expect(res.status).toBe(401);
  });

  it('returns 403 for a signed-in non-admin', async () => {
    const res = await requireAdmin(request('Bearer t'), fakeSupabase({ row: { is_admin: false } }));
    expect(res.status).toBe(403);
  });

  it('returns null for an admin', async () => {
    expect(await requireAdmin(request('Bearer t'), fakeSupabase({ row: { is_admin: true } }))).toBeNull();
  });

  it('marks error responses uncacheable', async () => {
    const res = await requireAdmin(request(), fakeSupabase());
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
