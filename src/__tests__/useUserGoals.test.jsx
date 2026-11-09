import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { supabase } from '../supabaseClient';
import { useUserGoals } from '../hooks/useUserGoals';

describe('useUserGoals', () => {
  it('orders by updated_at, a column production has', async () => {
    // Production's user_goals has no created_at. Ordering by it failed the
    // whole query with 42703 and every goals view came back empty.
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'g1' }], error: null });
    const eq = vi.fn(() => ({ order }));
    supabase.from.mockReturnValueOnce({ select: () => ({ eq, order }) });

    const { result } = renderHook(() => useUserGoals('u1'));

    await waitFor(() => expect(result.current.userGoals).toEqual([{ id: 'g1' }]));
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });
});
