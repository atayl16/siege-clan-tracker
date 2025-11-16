import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

// Mock sha256
vi.mock('crypto-hash', () => ({
  sha256: vi.fn((input) => {
    // Return the expected hashes for admin credentials
    if (input === 'admin') return Promise.resolve('8c91a3d71da50b56d355e4b61ff793842befb82bd5972e3b0d84fb771e450428');
    if (input === 'password') return Promise.resolve('86c671c7a776b62f925b5d2387fae4c73392931be4d37b19e37e5534abab587d');
    return Promise.resolve('hash_' + input);
  }),
}));

// Mock supabase client
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
      })),
      is: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
  rpc: vi.fn(),
};

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase,
}));

// Mock environment variables
const originalEnv = { ...import.meta.env };

describe('AuthContext - Admin Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set up environment variables
    import.meta.env.VITE_ADMIN_SUPABASE_EMAIL = 'admin@siegeclan.org';
    import.meta.env.VITE_ADMIN_SUPABASE_PASSWORD = 'test-admin-password';

    // Default mock implementations
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'test-uuid-123' } },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    import.meta.env = originalEnv;
  });

  describe('Admin Login with Supabase Session', () => {
    test('should create Supabase auth session when admin logs in', async () => {
      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('admin', 'password');
      });

      // Verify Supabase auth was called with correct credentials
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@siegeclan.org',
        password: 'test-admin-password',
      });

      // Verify login was successful
      expect(loginResult).toEqual({ success: true, isAdmin: true });

      // Verify admin state was set
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.username).toBe('admin');
      expect(result.current.user.is_admin).toBe(true);
    });

    test('should create admin user record with supabase_auth_id', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }));

      mockSupabase.from = mockFrom;

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('admin', 'password');
      });

      // Verify admin user record was created
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('users');
      });
    });

    test('should fail gracefully when VITE_ADMIN_SUPABASE_PASSWORD is not set', async () => {
      delete import.meta.env.VITE_ADMIN_SUPABASE_PASSWORD;

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('admin', 'password');
      });

      // Verify error message
      expect(loginResult.error).toBeDefined();
      expect(loginResult.error).toContain('not properly configured');

      // Verify Supabase auth was not called
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    test('should create Supabase account if sign-in fails on first login', async () => {
      // Mock sign-in to fail, then sign-up to succeed
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'new-uuid-456' } },
        error: null,
      });

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('admin', 'password');
      });

      // Verify sign-up was called
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'admin@siegeclan.org',
        password: 'test-admin-password',
        options: {
          data: {
            is_admin: true,
          },
        },
      });

      // Verify login was successful
      expect(loginResult).toEqual({ success: true, isAdmin: true });
    });

    test('should update existing admin user with supabase_auth_id', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const mockFrom = vi.fn((table) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 1,
                    username: 'admin',
                    supabase_auth_id: 'old-uuid'
                  },
                  error: null
                })),
              })),
            })),
            update: mockUpdate,
          };
        }
        return mockSupabase.from(table);
      });

      mockSupabase.from = mockFrom;

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('admin', 'password');
      });

      // Verify update was called
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Admin Logout', () => {
    test('should sign out from Supabase when logging out', async () => {
      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login('admin', 'password');
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      // Verify Supabase signOut was called
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();

      // Verify state was cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe('Error Handling', () => {
    test('should handle Supabase sign-up failure gracefully', async () => {
      // Mock both sign-in and sign-up to fail
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already registered' },
      });

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('admin', 'password');
      });

      // Verify error is returned
      expect(loginResult.error).toBeDefined();
      expect(loginResult.error).toContain('Failed to establish admin session');
    });

    test('should handle database errors when creating admin record', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' }
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({
          error: { message: 'Database error' }
        })),
      }));

      mockSupabase.from = mockFrom;

      const { AuthProvider, useAuth } = await import('../context/AuthContext');
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still succeed even if database insert fails
      // (admin can still log in with hardcoded credentials)
      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('admin', 'password');
      });

      // Login should succeed despite database error
      expect(loginResult.success).toBe(true);
    });
  });
});
