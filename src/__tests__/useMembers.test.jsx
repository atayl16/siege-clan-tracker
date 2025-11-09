import { vi } from 'vitest';

// Mock getAdminSupabaseClient BEFORE importing the hook
vi.mock('../utils/supabaseClient', () => ({
  getAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        is: () => ({
          order: () => Promise.resolve({
            data: [{ id: 1, name: 'Test Member' }],
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useMembers } from '../hooks/useMembers';

test('useMembers returns data', async () => {
  const { result } = renderHook(() => useMembers());
  await waitFor(() => {
    expect(result.current.members).toBeDefined();
    expect(result.current.members[0].name).toBe('Test Member');
  }, { timeout: 2000 });
}); 
