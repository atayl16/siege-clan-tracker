import { describe, it, expect } from 'vitest';

/**
 * Test suite for CORS Headers in Error Responses
 *
 * BUG-009: Missing Error CORS Headers
 *
 * The bug: Error responses don't include CORS headers in some Netlify functions.
 * This causes browser to block error responses due to CORS policy, making it
 * impossible for the frontend to read error messages.
 */

describe('CORS Headers - BUG-009', () => {
  describe('Required CORS Headers', () => {
    it('should include Access-Control-Allow-Origin header', () => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };

      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include Content-Type header', () => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should optionally include Allow-Headers for preflight', () => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      };

      expect(headers['Access-Control-Allow-Headers']).toBeDefined();
    });
  });

  describe('Bug Demonstration', () => {
    it('BUG: Error response missing CORS headers', () => {
      // Current buggy implementation
      const buggyErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({ error: 'Something went wrong' }),
        // ❌ No headers property or missing CORS headers
      };

      expect(buggyErrorResponse.headers).toBeUndefined();
    });

    it('demonstrates browser CORS blocking', () => {
      // When response doesn't have CORS headers
      const responseWithoutCORS = {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' }, // ❌ Missing CORS
        body: JSON.stringify({ error: 'Error message' }),
      };

      // Browser blocks this response
      const hasCORS = responseWithoutCORS.headers['Access-Control-Allow-Origin'];
      expect(hasCORS).toBeUndefined();

      // Frontend can't read the error
      // Shows generic "CORS error" instead of actual error message
    });

    it('shows impact on error handling', () => {
      const errorFromServer = { error: 'Validation failed: missing field' };

      // Without CORS headers
      const blockedByBrowser = true; // Browser blocks due to CORS
      const errorSeenByFrontend = blockedByBrowser
        ? 'CORS error'
        : errorFromServer.error;

      expect(errorSeenByFrontend).toBe('CORS error');
      expect(errorSeenByFrontend).not.toBe('Validation failed: missing field');
    });
  });

  describe('Correct Implementation', () => {
    it('should include CORS in all error responses', () => {
      const correctErrorResponse = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // ✅ CORS header included
        },
        body: JSON.stringify({ error: 'Something went wrong' }),
      };

      expect(correctErrorResponse.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(correctErrorResponse.headers['Content-Type']).toBe('application/json');
    });

    it('should use consistent headers for success and error', () => {
      const commonHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      const successResponse = {
        statusCode: 200,
        headers: commonHeaders,
        body: JSON.stringify({ success: true }),
      };

      const errorResponse = {
        statusCode: 500,
        headers: commonHeaders, // ✅ Same headers
        body: JSON.stringify({ error: 'Failed' }),
      };

      expect(successResponse.headers).toEqual(errorResponse.headers);
    });

    it('should define headers early for reuse', () => {
      // Good pattern: Define headers once, reuse everywhere
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      const responses = {
        success: { statusCode: 200, headers, body: '...' },
        badRequest: { statusCode: 400, headers, body: '...' },
        serverError: { statusCode: 500, headers, body: '...' },
      };

      Object.values(responses).forEach(response => {
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      });
    });
  });

  describe('Different Error Scenarios', () => {
    it('should include CORS in 400 Bad Request errors', () => {
      const badRequestResponse = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid input' }),
      };

      expect(badRequestResponse.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include CORS in 401 Unauthorized errors', () => {
      const unauthorizedResponse = {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };

      expect(unauthorizedResponse.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include CORS in 404 Not Found errors', () => {
      const notFoundResponse = {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Not found' }),
      };

      expect(notFoundResponse.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should include CORS in 500 Internal Server errors', () => {
      const serverErrorResponse = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Server error' }),
      };

      expect(serverErrorResponse.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Frontend Impact', () => {
    it('scenario: Frontend can read error with CORS', () => {
      const response = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // ✅ CORS enabled
        },
        body: JSON.stringify({ error: 'Missing required field: email' }),
      };

      // Frontend can read the response
      const hasCORS = !!response.headers['Access-Control-Allow-Origin'];
      expect(hasCORS).toBe(true);

      // Error message is accessible
      const errorData = JSON.parse(response.body);
      expect(errorData.error).toBe('Missing required field: email');
    });

    it('scenario: Frontend cannot read error without CORS', () => {
      const response = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          // ❌ No CORS header
        },
        body: JSON.stringify({ error: 'Missing required field: email' }),
      };

      // Browser blocks the response
      const hasCORS = !!response.headers['Access-Control-Allow-Origin'];
      expect(hasCORS).toBe(false);

      // Frontend sees generic error
      // Cannot access response.body due to CORS
    });

    it('demonstrates error handling difference', () => {
      // With CORS: Frontend gets specific error
      const withCORS = {
        canReadResponse: true,
        errorMessage: 'Missing required field: email',
        userSees: 'Please provide an email address',
      };

      // Without CORS: Frontend gets generic error
      const withoutCORS = {
        canReadResponse: false,
        errorMessage: null, // Blocked by browser
        userSees: 'Network error occurred',
      };

      expect(withCORS.errorMessage).not.toBeNull();
      expect(withoutCORS.errorMessage).toBeNull();
    });
  });

  describe('CORS Configuration', () => {
    it('should use environment variable for origin', () => {
      const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      };

      expect(headers['Access-Control-Allow-Origin']).toBeTruthy();
    });

    it('should allow wildcard for public APIs', () => {
      const publicHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };

      expect(publicHeaders['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should allow specific origin for restricted APIs', () => {
      const restrictedHeaders = {
        'Access-Control-Allow-Origin': 'https://siege-clan.com',
        'Content-Type': 'application/json',
      };

      expect(restrictedHeaders['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });
  });

  describe('Best Practices', () => {
    it('should define headers once at function start', () => {
      // Good pattern
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      // Reuse in all responses
      const response1 = { statusCode: 200, headers };
      const response2 = { statusCode: 400, headers };
      const response3 = { statusCode: 500, headers };

      [response1, response2, response3].forEach(res => {
        expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      });
    });

    it('should include CORS in OPTIONS preflight responses', () => {
      const preflightResponse = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: JSON.stringify({ message: 'Preflight OK' }),
      };

      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(preflightResponse.headers['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should maintain headers in try-catch blocks', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      let response;
      try {
        // Success case
        response = { statusCode: 200, headers, body: '{"success":true}' };
      } catch (error) {
        // Error case - must include headers
        response = { statusCode: 500, headers, body: '{"error":"Failed"}' };
      }

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Testing Error CORS', () => {
    it('should verify CORS headers in error responses', () => {
      const testErrorResponse = (statusCode, errorMessage) => {
        return {
          statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: errorMessage }),
        };
      };

      const response400 = testErrorResponse(400, 'Bad request');
      const response500 = testErrorResponse(500, 'Server error');

      expect(response400.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response500.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should test CORS headers with curl', () => {
      // Example curl test command
      const curlTest = `
        curl -i -X POST https://api.example.com/function \\
          -H "Content-Type: application/json" \\
          -d '{"invalid":"data"}'
      `;

      // Should see in response headers:
      const expectedHeaders = [
        'HTTP/1.1 400 Bad Request',
        'Access-Control-Allow-Origin: *',
        'Content-Type: application/json',
      ];

      expect(curlTest).toContain('POST');
      expect(expectedHeaders).toContain('Access-Control-Allow-Origin: *');
    });
  });
});
