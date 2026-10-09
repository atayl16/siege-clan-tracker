import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { vi } from 'vitest';
import { supabase } from '../supabaseClient';
import { useUsers } from '../hooks/useUsers';

// Fresh SWR cache per test, so one test's response cannot satisfy another's.
const wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useUsers', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('makes no request for a visitor who is not an admin', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('sends the admin session token', async () => {
    localStorage.setItem('adminAuth', 'true');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'admin-jwt' } },
      error: null,
    });
    const users = [{ id: 'u1', username: 'admin', is_admin: true }];
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(users) });

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.users).toEqual(users));
    expect(global.fetch).toHaveBeenCalledWith('/api/users', {
      headers: { Authorization: 'Bearer admin-jwt' },
    });
  });

  it('reports a rejected request as an error, not as the user list', async () => {
    localStorage.setItem('adminAuth', 'true');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'expired' } },
      error: null,
    });
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized: Invalid token' }),
    });

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error.message).toBe('Unauthorized: Invalid token');
    expect(result.current.users).toBeUndefined();
  });
});
