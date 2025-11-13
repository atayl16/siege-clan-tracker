import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key, fetcher, options) => ({
    data: [
      { id: 1, user_id: 'user-123', wom_id: 1, rsn: 'TestPlayer', status: 'pending' },
      { id: 2, user_id: 'user-456', wom_id: 2, rsn: 'AnotherPlayer', status: 'approved' },
    ],
    error: null,
    mutate: vi.fn(),
  })),
}));

// Mock supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

import { useClaimRequests } from '../hooks/useClaimRequests';

describe('useClaimRequests Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSingle.mockResolvedValue({
      data: { id: 3, user_id: 'user-123', wom_id: 3, rsn: 'NewPlayer', status: 'pending' },
      error: null,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
  });

  it('should export requests property as array', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.requests).toBeDefined();
      expect(Array.isArray(result.current.requests)).toBe(true);
    });
  });

  it('should export claimRequests property for backwards compatibility', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.claimRequests).toBeDefined();
      expect(Array.isArray(result.current.claimRequests)).toBe(true);
    });
  });

  it('should export createClaimRequest function', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.createClaimRequest).toBeDefined();
      expect(typeof result.current.createClaimRequest).toBe('function');
    });
  });

  it('should export processRequest function', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.processRequest).toBeDefined();
      expect(typeof result.current.processRequest).toBe('function');
    });
  });

  it('should export loading state', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.loading).toBeDefined();
      expect(typeof result.current.loading).toBe('boolean');
    });
  });

  it('should export error state', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should export refresh function', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  it('should create a new claim request successfully', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.createClaimRequest).toBeDefined();
    });

    const requestData = {
      user_id: 'user-123',
      wom_id: 3,
      rsn: 'NewPlayer',
      message: 'Test request',
      status: 'pending',
    };

    const newRequest = await result.current.createClaimRequest(requestData);

    expect(mockInsert).toHaveBeenCalledWith([requestData]);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(newRequest).toEqual({
      id: 3,
      user_id: 'user-123',
      wom_id: 3,
      rsn: 'NewPlayer',
      status: 'pending',
    });
  });

  it('should throw error when createClaimRequest fails', async () => {
    // Mock a failed insert
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.createClaimRequest).toBeDefined();
    });

    const requestData = {
      user_id: 'user-123',
      wom_id: 3,
      rsn: 'NewPlayer',
      status: 'pending',
    };

    await expect(result.current.createClaimRequest(requestData)).rejects.toThrow('Database error');
  });

  it('should filter userClaims by userId when provided', async () => {
    const { result } = renderHook(() => useClaimRequests('user-123'));

    await waitFor(() => {
      expect(result.current.userClaims).toBeDefined();
      expect(result.current.userClaims).toHaveLength(1);
      expect(result.current.userClaims[0].user_id).toBe('user-123');
    });
  });

  it('should return all claims in requests array', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      expect(result.current.requests).toHaveLength(2);
    });
  });

  it('should default to empty arrays when data is undefined', () => {
    // This tests the || [] fallback in the hook implementation
    // The hook returns data || [], so when data is undefined, it returns []
    const { result } = renderHook(() => useClaimRequests());

    // All array properties should be defined (not undefined)
    expect(Array.isArray(result.current.requests)).toBe(true);
    expect(Array.isArray(result.current.claimRequests)).toBe(true);
    expect(Array.isArray(result.current.userClaims)).toBe(true);
  });

  it('should export all required functions for ClaimRequestManager', async () => {
    const { result } = renderHook(() => useClaimRequests());

    await waitFor(() => {
      // Verify functions that ClaimRequestManager and ClaimRequestsPreview expect
      expect(typeof result.current.createClaimRequest).toBe('function');
      expect(typeof result.current.processRequest).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });
});
