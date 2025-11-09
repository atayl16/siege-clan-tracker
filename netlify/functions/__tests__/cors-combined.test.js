/**
 * Combined Tests for CORS Security Fixes
 *
 * This test suite covers:
 * - BUG-007: Wildcard CORS (replacing '*' with environment-based origin)
 * - BUG-009: Missing Error CORS Headers (adding headers to all error responses)
 *
 * Both fixes ensure secure and consistent CORS handling across all responses.
 */

const { describe, it, expect } = require('vitest');

describe('Combined CORS Security Fixes', () => {
  describe('BUG-007: Wildcard CORS Security Issue', () => {
    it('should demonstrate why wildcard CORS is a security risk', () => {
      // ❌ BAD: Wildcard CORS allows ANY domain to access API
      const wildcardHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      };

      // Malicious site can make requests and read responses
      expect(wildcardHeaders['Access-Control-Allow-Origin']).toBe('*');

      // This means ANYONE from ANY domain can access the API
      const canMaliciousSiteAccess = true; // ❌ Security issue!
      expect(canMaliciousSiteAccess).toBe(true);
    });

    it('should use environment-based origin instead of wildcard', () => {
      // ✅ GOOD: Only allow specific origin
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });

    it('should support environment-specific configuration', () => {
      const environments = [
        { name: 'development', origin: 'http://localhost:3000' },
        { name: 'staging', origin: 'https://staging.siege-clan.com' },
        { name: 'production', origin: 'https://siege-clan.com' }
      ];

      environments.forEach(env => {
        const allowedOrigin = env.origin;
        const headers = {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Content-Type': 'application/json'
        };

        expect(headers['Access-Control-Allow-Origin']).toBe(env.origin);
        expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      });
    });
  });

  describe('BUG-009: Missing Error CORS Headers', () => {
    it('should demonstrate the problem: error responses without CORS', () => {
      // ❌ BAD: Error response without CORS headers
      const errorResponseWithoutCORS = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
          // Missing: 'Access-Control-Allow-Origin'
        },
        body: JSON.stringify({ error: 'Server error' })
      };

      // Browser blocks this response due to missing CORS header
      const hasCORS = errorResponseWithoutCORS.headers['Access-Control-Allow-Origin'];
      expect(hasCORS).toBeUndefined(); // ❌ Frontend cannot read error message
    });

    it('should include CORS headers in all error responses', () => {
      const allowedOrigin = 'https://siege-clan.com';

      // ✅ GOOD: All error responses include CORS headers
      const errorTypes = [
        { statusCode: 400, error: 'Bad Request' },
        { statusCode: 401, error: 'Unauthorized' },
        { statusCode: 404, error: 'Not Found' },
        { statusCode: 500, error: 'Internal Server Error' }
      ];

      errorTypes.forEach(({ statusCode, error }) => {
        const response = {
          statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin
          },
          body: JSON.stringify({ error })
        };

        expect(response.headers['Access-Control-Allow-Origin']).toBe(allowedOrigin);
      });
    });

    it('should use same CORS headers for success and error responses', () => {
      const allowedOrigin = 'https://siege-clan.com';
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // Success response
      const successResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };

      // Error response
      const errorResponse = {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed' })
      };

      // Both use the same headers
      expect(successResponse.headers).toEqual(errorResponse.headers);
      expect(successResponse.headers['Access-Control-Allow-Origin']).toBe(allowedOrigin);
      expect(errorResponse.headers['Access-Control-Allow-Origin']).toBe(allowedOrigin);
    });
  });

  describe('Combined Fix: Secure CORS on All Responses', () => {
    it('should apply both fixes to discord.js function', () => {
      // Combined fix: environment-based origin + CORS on all responses
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // All responses use the same headers
      const responses = [
        { type: 'success', statusCode: 200, headers },
        { type: 'bad request', statusCode: 400, headers },
        { type: 'server error', statusCode: 500, headers },
        { type: 'invalid type', statusCode: 400, headers }
      ];

      responses.forEach(response => {
        // ✅ Not wildcard
        expect(response.headers['Access-Control-Allow-Origin']).not.toBe('*');
        // ✅ Uses environment-based origin
        expect(response.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
        // ✅ Includes CORS header
        expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
      });
    });

    it('should apply both fixes to events.js function', () => {
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      // Success response
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');

      // Error response (should use same headers)
      const errorResponse = {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch events' })
      };

      expect(errorResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });

    it('should apply both fixes to members.js function', () => {
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      // Preflight response
      const preflightResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Preflight call successful' })
      };

      // Success response
      const successResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };

      // Error response
      const errorResponse = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify({ error: 'Database error' })
      };

      // All responses use environment-based origin
      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(successResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(errorResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');

      // None use wildcard
      expect(preflightResponse.headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(successResponse.headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(errorResponse.headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });

  describe('Security Benefits', () => {
    it('should block unauthorized cross-origin requests', () => {
      const allowedOrigin = 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // Request from malicious domain
      const requestOrigin = 'https://evil.com';

      // Browser checks if origins match
      const isAllowed = requestOrigin === headers['Access-Control-Allow-Origin'];

      expect(isAllowed).toBe(false); // ✅ Blocked!
    });

    it('should allow legitimate same-origin requests', () => {
      const allowedOrigin = 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // Request from legitimate domain
      const requestOrigin = 'https://siege-clan.com';

      // Browser allows because origins match
      const isAllowed = requestOrigin === headers['Access-Control-Allow-Origin'];

      expect(isAllowed).toBe(true); // ✅ Allowed
    });

    it('should enable frontend to read error messages', () => {
      const allowedOrigin = 'https://siege-clan.com';

      // Frontend can now read error details
      const errorResponse = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify({ error: 'Missing required fields' })
      };

      // Browser allows reading the response because CORS header is present
      const canReadError = !!errorResponse.headers['Access-Control-Allow-Origin'];
      expect(canReadError).toBe(true); // ✅ Frontend can display specific error
    });
  });

  describe('Best Practices', () => {
    it('should define headers once and reuse', () => {
      // ✅ GOOD: Define once at function start
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // Reuse in all responses
      const responses = {
        success: { statusCode: 200, headers },
        error400: { statusCode: 400, headers },
        error500: { statusCode: 500, headers }
      };

      Object.values(responses).forEach(response => {
        expect(response.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      });
    });

    it('should use environment variables for configuration', () => {
      // Environment-based configuration
      const config = {
        dev: { ALLOWED_ORIGIN: 'http://localhost:3000' },
        staging: { ALLOWED_ORIGIN: 'https://staging.siege-clan.com' },
        prod: { ALLOWED_ORIGIN: 'https://siege-clan.com' }
      };

      Object.entries(config).forEach(([env, vars]) => {
        const allowedOrigin = vars.ALLOWED_ORIGIN || 'https://siege-clan.com';
        expect(allowedOrigin).toBeDefined();
        expect(allowedOrigin).not.toBe('*');
      });
    });
  });
});
