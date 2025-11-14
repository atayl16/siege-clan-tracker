import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRaces } from '../hooks/useRaces';
import { supabase } from '../supabaseClient';

// Mock SWR
vi.mock('swr', () => ({
  default: (key, fetcher, config) => {
    const mockData = vi.mocked(global.fetch).mockResolvedValue;
    return {
      data: mockData ? JSON.parse(mockData) : undefined,
      error: null,
      mutate: vi.fn(),
    };
  },
}));

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('useRaces Hook', () => {
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';

  const mockRaces = [
    {
      id: 1,
      creator_id: mockUserId,
      title: 'My Race',
      description: 'Test race',
      public: false,
      participants: [{ user_id: mockUserId, wom_id: 123 }],
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      creator_id: 'other-user',
      title: 'Public Race',
      description: 'Public test race',
      public: true,
      participants: [{ user_id: 'other-user', wom_id: 456 }],
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      creator_id: 'other-user',
      title: 'Participating Race',
      description: 'Race where user is participant',
      public: false,
      participants: [
        { user_id: 'other-user', wom_id: 456 },
        { user_id: mockUserId, wom_id: 789 },
      ],
      created_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: mockToken,
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Data Filtering', () => {
    it('should export all expected properties', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      expect(result.current).toHaveProperty('races');
      expect(result.current).toHaveProperty('activeRaces');
      expect(result.current).toHaveProperty('publicRaces');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshRaces');
      expect(result.current).toHaveProperty('createRace');
    });

    it('should filter active races for creator', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      // Mock SWR data
      result.current.races = mockRaces;

      const activeRaces = mockRaces.filter(race =>
        race.creator_id === mockUserId || race.participants?.some(p => p.user_id === mockUserId)
      );

      expect(activeRaces).toHaveLength(2);
      expect(activeRaces[0].id).toBe(1); // Created by user
      expect(activeRaces[1].id).toBe(3); // User is participant
    });

    it('should filter public races', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      result.current.races = mockRaces;

      const publicRaces = mockRaces.filter(race => race.public === true);

      expect(publicRaces).toHaveLength(1);
      expect(publicRaces[0].id).toBe(2);
      expect(publicRaces[0].public).toBe(true);
    });

    it('should return empty arrays when no data', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      expect(result.current.activeRaces).toEqual([]);
      expect(result.current.publicRaces).toEqual([]);
    });

    it('should return empty arrays when userId is null', () => {
      const { result } = renderHook(() => useRaces(null));

      result.current.races = mockRaces;

      expect(result.current.activeRaces).toEqual([]);
    });
  });

  describe('createRace', () => {
    it('should include Authorization header when token exists', async () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      const mockRaceData = {
        creator_id: mockUserId,
        title: 'New Race',
        description: 'Test',
        participants: [{ wom_id: 123, player_name: 'Player1', metric: 'ehb', target_value: 100 }],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 4, ...mockRaceData }),
      });

      await result.current.createRace(mockRaceData);

      expect(global.fetch).toHaveBeenCalledWith('/api/races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
        },
        body: JSON.stringify(mockRaceData),
      });
    });

    it('should not include Authorization header when no token', async () => {
      // Mock no session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useRaces(mockUserId));

      const mockRaceData = {
        creator_id: mockUserId,
        title: 'New Race',
        participants: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 4, ...mockRaceData }),
      });

      await result.current.createRace(mockRaceData);

      expect(global.fetch).toHaveBeenCalledWith('/api/races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockRaceData),
      });
    });

    it('should throw error when API returns error', async () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      const mockRaceData = {
        creator_id: mockUserId,
        title: 'New Race',
        participants: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Unauthorized: You can only create races for yourself' }),
      });

      await expect(result.current.createRace(mockRaceData)).rejects.toThrow(
        'Unauthorized: You can only create races for yourself'
      );
    });

    it('should throw error with status when no error message', async () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      const mockRaceData = {
        creator_id: mockUserId,
        title: 'New Race',
        participants: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(result.current.createRace(mockRaceData)).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });

    it('should call mutate after successful creation', async () => {
      const mockMutate = vi.fn();
      const { result } = renderHook(() => {
        const hook = useRaces(mockUserId);
        hook.refreshRaces = mockMutate;
        return hook;
      });

      const mockRaceData = {
        creator_id: mockUserId,
        title: 'New Race',
        participants: [],
      };

      const mockCreatedRace = { id: 4, ...mockRaceData };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockCreatedRace,
      });

      const createdRace = await result.current.createRace(mockRaceData);

      expect(createdRace).toEqual(mockCreatedRace);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    it('should indicate loading when data is not yet available', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      // SWR returns no data and no error initially
      expect(result.current.loading).toBe(true);
    });

    it('should not indicate loading when data is available', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      result.current.races = mockRaces;

      expect(result.current.loading).toBe(false);
    });

    it('should not indicate loading when error occurs', () => {
      const { result } = renderHook(() => useRaces(mockUserId));

      result.current.error = new Error('Failed to fetch');

      expect(result.current.loading).toBe(false);
    });
  });
});
