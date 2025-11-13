import { vi, describe, it, expect } from 'vitest';

// Mock getAdminSupabaseClient BEFORE importing the hook
vi.mock('../utils/supabaseClient', () => ({
  getAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({
          data: [{ id: 1, name: 'Test Member' }],
          error: null,
        }),
      }),
    }),
  }),
}));

import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useMembers } from '../hooks/useMembers';

describe('useMembers Hook', () => {
  it('should return members data', async () => {
    const { result } = renderHook(() => useMembers());
    await waitFor(() => {
      expect(result.current.members).toBeDefined();
      expect(result.current.members[0].name).toBe('Test Member');
    }, { timeout: 2000 });
  });

  it('should export refreshMembers function (not refresh)', async () => {
    const { result } = renderHook(() => useMembers());
    await waitFor(() => {
      expect(result.current.refreshMembers).toBeDefined();
      expect(typeof result.current.refreshMembers).toBe('function');
      // Ensure 'refresh' does NOT exist (common mistake in ClaimPlayer.jsx)
      expect(result.current.refresh).toBeUndefined();
    }, { timeout: 2000 });
  });

  it('should export loading state', async () => {
    const { result } = renderHook(() => useMembers());
    await waitFor(() => {
      expect(result.current.loading).toBeDefined();
      expect(typeof result.current.loading).toBe('boolean');
    }, { timeout: 2000 });
  });

  it('should export error state', async () => {
    const { result } = renderHook(() => useMembers());
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    }, { timeout: 2000 });
  });

  it('should export all required functions', async () => {
    const { result } = renderHook(() => useMembers());
    await waitFor(() => {
      // Verify all functions that ClaimPlayer or other components might use
      expect(typeof result.current.createMember).toBe('function');
      expect(typeof result.current.updateMember).toBe('function');
      expect(typeof result.current.deleteMember).toBe('function');
      expect(typeof result.current.whitelistRunewatchMember).toBe('function');
      expect(typeof result.current.toggleMemberVisibility).toBe('function');
      expect(typeof result.current.changeMemberRank).toBe('function');
    }, { timeout: 2000 });
  });
}); 
