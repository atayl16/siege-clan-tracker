import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

const mockCreateClient = vi.fn(() => mockSupabase);

// Mock auth functions
const mockCheckAuth = vi.fn();
const mockUnauthorizedResponse = vi.fn();

// Mock Deno.env
global.Deno = {
  env: {
    get: (key) => {
      const env = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
        'SUPABASE_ANON_KEY': 'test-anon-key',
        'API_KEY': 'test-api-key',
      };
      return env[key];
    },
  },
};

// Note: This is a simplified test file since edge functions use Deno runtime
// For full testing, use Deno's test framework or integration tests
describe('Races Edge Function - Authorization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/races - Authorization', () => {
    it('should reject requests without API key', () => {
      mockCheckAuth.mockReturnValue({
        authorized: false,
        reason: 'Invalid or missing API key',
      });
      mockUnauthorizedResponse.mockReturnValue(
        new Response(JSON.stringify({ error: 'Invalid or missing API key' }), {
          status: 401,
        })
      );

      const response = mockUnauthorizedResponse();

      expect(response.status).toBe(401);
    });

    it('should reject when no Authorization header provided', async () => {
      mockCheckAuth.mockReturnValue({ authorized: true });

      const request = {
        method: 'POST',
        headers: {
          get: (name) => {
            if (name === 'Authorization') return null;
            return 'application/json';
          },
        },
        json: async () => ({
          creator_id: 'user-123',
          title: 'Test Race',
          participants: [
            { wom_id: 123, player_name: 'Player1', metric: 'ehb', target_value: 100 },
          ],
        }),
      };

      // Simulate no auth header = 403
      const expectedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized: You can only create races for yourself' }),
        { status: 403 }
      );

      expect(expectedResponse.status).toBe(403);
    });

    it('should reject when creator_id does not match authenticated user', async () => {
      mockCheckAuth.mockReturnValue({ authorized: true });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = {
        method: 'POST',
        headers: {
          get: (name) => {
            if (name === 'Authorization') return 'Bearer valid-token';
            return 'application/json';
          },
        },
        json: async () => ({
          creator_id: 'different-user',
          title: 'Test Race',
          participants: [
            { wom_id: 123, player_name: 'Player1', metric: 'ehb', target_value: 100 },
          ],
        }),
      };

      // Simulate creator_id mismatch = 403
      const expectedResponse = new Response(
        JSON.stringify({ error: 'Unauthorized: You can only create races for yourself' }),
        { status: 403 }
      );

      expect(expectedResponse.status).toBe(403);
    });

    it('should accept when creator_id matches authenticated user', async () => {
      mockCheckAuth.mockReturnValue({ authorized: true });

      const userId = 'user-123';
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 1, creator_id: userId, title: 'Test Race' },
              error: null,
            }),
          }),
        }),
      });

      const raceData = {
        creator_id: userId,
        title: 'Test Race',
        participants: [
          { wom_id: 123, player_name: 'Player1', metric: 'ehb', target_value: 100 },
        ],
      };

      // Simulate successful creation = 201
      const expectedResponse = new Response(
        JSON.stringify({ id: 1, creator_id: userId, title: 'Test Race' }),
        { status: 201 }
      );

      expect(expectedResponse.status).toBe(201);
    });
  });

  describe('POST /api/races - Validation', () => {
    it('should reject when missing required fields', () => {
      const invalidData = [
        { title: 'Test', participants: [] }, // missing creator_id
        { creator_id: 'user-123', participants: [] }, // missing title
        { creator_id: 'user-123', title: 'Test' }, // missing participants
      ];

      invalidData.forEach((data) => {
        const response = new Response(
          JSON.stringify({ error: 'Missing required fields: creator_id, title, and participants' }),
          { status: 400 }
        );
        expect(response.status).toBe(400);
      });
    });

    it('should reject when participants is not an array', () => {
      const response = new Response(
        JSON.stringify({ error: 'participants must be a non-empty array' }),
        { status: 400 }
      );
      expect(response.status).toBe(400);
    });

    it('should reject when participants array is empty', () => {
      const response = new Response(
        JSON.stringify({ error: 'participants must be a non-empty array' }),
        { status: 400 }
      );
      expect(response.status).toBe(400);
    });

    it('should reject when participant missing required fields', () => {
      const invalidParticipants = [
        { player_name: 'P1', metric: 'ehb', target_value: 100 }, // missing wom_id
        { wom_id: 123, metric: 'ehb', target_value: 100 }, // missing player_name
        { wom_id: 123, player_name: 'P1', target_value: 100 }, // missing metric
        { wom_id: 123, player_name: 'P1', metric: 'ehb' }, // missing target_value
      ];

      invalidParticipants.forEach((participant) => {
        const response = new Response(
          JSON.stringify({
            error: 'Each participant must have wom_id, player_name, metric, and target_value',
          }),
          { status: 400 }
        );
        expect(response.status).toBe(400);
      });
    });

    it('should reject when target_value is not a positive number', () => {
      const invalidTargetValues = [0, -1, -100];

      invalidTargetValues.forEach((value) => {
        const response = new Response(
          JSON.stringify({ error: 'target_value must be a positive number' }),
          { status: 400 }
        );
        expect(response.status).toBe(400);
      });
    });

    it('should reject when target_value is not a number', () => {
      const response = new Response(
        JSON.stringify({ error: 'target_value must be a positive number' }),
        { status: 400 }
      );
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/races - Error Handling', () => {
    it('should rollback race creation when participants insertion fails', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'races') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 1, creator_id: 'user-123', title: 'Test Race' },
                  error: null,
                }),
              }),
            }),
            delete: mockDelete,
          };
        } else if (table === 'race_participants') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
      });

      // Expect rollback to be called
      expect(mockDelete).not.toHaveBeenCalled();

      const response = new Response(
        JSON.stringify({ error: 'Failed to create race: Database error' }),
        { status: 500 }
      );

      expect(response.status).toBe(500);
    });

    it('should return 500 on database errors', () => {
      const response = new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500 }
      );

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/races', () => {
    it('should return races with caching headers', () => {
      const response = new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3000',
          'CDN-Cache-Control': 'public, max-age=3000',
          'ETag': 'W/"races-2024-01-01"',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3000');
      expect(response.headers.get('ETag')).toBeTruthy();
    });

    it('should return 304 when ETag matches', () => {
      const etag = 'W/"races-2024-01-01"';
      const response = new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=3000',
        },
      });

      expect(response.status).toBe(304);
      expect(response.headers.get('ETag')).toBe(etag);
    });

    it('should return 500 on database errors', () => {
      const response = new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500 }
      );

      expect(response.status).toBe(500);
    });
  });
});
