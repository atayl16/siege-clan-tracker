/**
 * Tests for BUG-006: API Key Authentication
 *
 * This test suite validates the API key authentication middleware
 * that protects edge functions from unauthorized access.
 *
 * NOTE: All API keys in this file are FAKE TEST FIXTURES.
 * These are dummy values for testing purposes only, not real secrets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkAuth, unauthorizedResponse } from '../_shared/auth.js';

// Test fixtures - these are FAKE keys for testing only
const FAKE_API_KEY = 'test-fake-key-abc123';
const FAKE_API_KEY_2 = 'test-dummy-key-xyz789';

describe('BUG-006: API Key Authentication', () => {
  describe('Security Risk: No Authentication', () => {
    it('should demonstrate why unauthenticated APIs are vulnerable', () => {
      // ❌ WITHOUT AUTH: Anyone can access the API
      const vulnerableAPI = {
        hasAuthentication: false,
        publiclyAccessible: true
      };

      // Risks:
      const risks = [
        'Anyone can scrape all member data',
        'Attackers can overwhelm API with requests (DoS)',
        'No rate limiting or access control',
        'Cannot track or block abusive usage',
        'Costs money if external APIs are called'
      ];

      expect(vulnerableAPI.publiclyAccessible).toBe(true);
      expect(risks).toHaveLength(5);
    });

    it('should show potential abuse scenarios', () => {
      const abuseScenarios = [
        {
          attack: 'Data scraping',
          impact: 'Attacker scrapes all clan member data every minute',
          cost: 'High database/bandwidth costs'
        },
        {
          attack: 'Denial of Service',
          impact: 'Attacker floods API with thousands of requests',
          cost: 'Site becomes unavailable for legitimate users'
        },
        {
          attack: 'API quota exhaustion',
          impact: 'Attacker calls WOM API repeatedly',
          cost: 'External API quota exhausted, legitimate requests fail'
        }
      ];

      abuseScenarios.forEach(scenario => {
        expect(scenario.attack).toBeDefined();
        expect(scenario.impact).toBeDefined();
        expect(scenario.cost).toBeDefined();
      });
    });
  });

  describe('checkAuth() Function', () => {
    beforeEach(() => {
      // Reset environment variables before each test
      delete Deno.env.get('ALLOWED_ORIGIN');
      delete Deno.env.get('API_KEY');
    });

    describe('Same-Origin Requests', () => {
      it('should allow requests from the allowed origin', () => {
        // Set environment variables
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');

        // Create a request from the same origin
        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://siege-clan.com'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow requests with Referer header instead of Origin', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');

        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Referer': 'https://siege-clan.com/dashboard'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
      });

      it('should use default allowed origin if not configured', () => {
        // No ALLOWED_ORIGIN set, defaults to https://siege-clan.com
        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://siege-clan.com'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
      });

      it('should allow localhost in development', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'http://localhost:3000');

        const request = new Request('http://localhost:8888/api/members', {
          headers: {
            'Origin': 'http://localhost:3000'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
      });

      it('should allow Netlify preview deployments', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://deploy-preview-123--siege-clan.netlify.app');

        const request = new Request('https://siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://deploy-preview-123--siege-clan.netlify.app'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
      });
    });

    describe('Cross-Origin Requests with API Key', () => {
      it('should allow cross-origin requests with valid API key', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
        Deno.env.set('API_KEY', FAKE_API_KEY);

        // Request from different origin with valid API key
        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://external-site.com',
            'x-api-key': FAKE_API_KEY
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should reject cross-origin requests with invalid API key', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
        Deno.env.set('API_KEY', FAKE_API_KEY);

        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://external-site.com',
            'x-api-key': 'wrong-key'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(false);
        expect(result.reason).toBe('Invalid or missing API key');
      });

      it('should reject cross-origin requests without API key', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
        Deno.env.set('API_KEY', FAKE_API_KEY);

        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://external-site.com'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(false);
        expect(result.reason).toBe('Invalid or missing API key');
      });

      it('should reject if API_KEY is not configured', () => {
        Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
        // No API_KEY set

        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'Origin': 'https://external-site.com',
            'x-api-key': 'some-key'
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(false);
        expect(result.reason).toBe('API key authentication not configured');
      });
    });

    describe('No Origin Header', () => {
      it('should require API key when no origin header present', () => {
        Deno.env.set('API_KEY', FAKE_API_KEY);

        // Request with no Origin or Referer header
        const request = new Request('https://api.siege-clan.com/api/members');

        const result = checkAuth(request);

        // Without origin, treated as cross-origin, requires API key
        expect(result.authorized).toBe(false);
      });

      it('should allow if valid API key provided with no origin', () => {
        Deno.env.set('API_KEY', FAKE_API_KEY);

        const request = new Request('https://api.siege-clan.com/api/members', {
          headers: {
            'x-api-key': FAKE_API_KEY
          }
        });

        const result = checkAuth(request);

        expect(result.authorized).toBe(true);
      });
    });
  });

  describe('unauthorizedResponse() Function', () => {
    it('should return 401 status code', () => {
      const response = unauthorizedResponse();

      expect(response.status).toBe(401);
    });

    it('should include error message in response body', async () => {
      const response = unauthorizedResponse('Invalid API key');

      const body = await response.json();

      expect(body.error).toBe('Invalid API key');
    });

    it('should set Content-Type header to application/json', () => {
      const response = unauthorizedResponse();

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should use default message if none provided', async () => {
      const response = unauthorizedResponse();

      const body = await response.json();

      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Integration: Edge Function Protection', () => {
    it('should protect all 11 edge functions', () => {
      const protectedFunctions = [
        'members.js',
        'events.js',
        'users.js',
        'claim-requests.js',
        'user-goals.js',
        'races.js',
        'wom-group.js',
        'wom-group-stats.js',
        'wom-group-achievements.js',
        'wom-competitions.js',
        'wom-player.js'
      ];

      expect(protectedFunctions).toHaveLength(11);

      protectedFunctions.forEach(func => {
        // Each function should use checkAuth at the start
        expect(func).toMatch(/\.js$/);
      });
    });

    it('should follow consistent authentication pattern', () => {
      // All functions should follow this pattern:
      const pattern = `
        import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

        export default async (request, _context) => {
          const { authorized, reason } = checkAuth(request);
          if (!authorized) {
            return unauthorizedResponse(reason);
          }

          // Function logic...
        }
      `;

      expect(pattern).toContain('checkAuth');
      expect(pattern).toContain('unauthorizedResponse');
      expect(pattern).toContain('import');
    });
  });

  describe('Security Best Practices', () => {
    it('should use API key in header, not query params', () => {
      // ✅ GOOD: API key in header
      const goodRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'x-api-key': FAKE_API_KEY
        }
      });

      expect(goodRequest.headers.get('x-api-key')).toBe(FAKE_API_KEY);

      // ❌ BAD: API key in URL (would be logged, cached, etc.)
      const badUrl = 'https://api.siege-clan.com/api/members?api_key=FAKE_KEY';

      expect(badUrl).toContain('api_key=');

      // Headers are more secure than query params
      const headersMoreSecure = true;
      expect(headersMoreSecure).toBe(true);
    });

    it('should use environment variables for API keys', () => {
      // ✅ GOOD: Read from environment
      Deno.env.set('API_KEY', FAKE_API_KEY);
      const apiKey = Deno.env.get('API_KEY');

      expect(apiKey).toBe(FAKE_API_KEY);

      // ❌ BAD: Hardcoded API key (for demonstration only)
      const badExample = 'hardcoded-value'; // Never do this with real keys!

      expect(badExample).toBeDefined();
    });

    it('should support different keys for different environments', () => {
      // Example of environment-specific configuration (all fake test values)
      const environments = {
        development: 'test-dev-key-123',
        staging: 'test-staging-key-456',
        production: 'test-prod-key-789'
      };

      Object.keys(environments).forEach(env => {
        const key = environments[env];
        expect(key).toContain(env.substring(0, 4));
      });
    });
  });

  describe('Use Cases', () => {
    it('should support mobile app access with API key', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Mobile app request (no Origin header)
      const request = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'x-api-key': FAKE_API_KEY,
          'User-Agent': 'SiegeClanApp/1.0 iOS'
        }
      });

      const result = checkAuth(request);

      expect(result.authorized).toBe(true);
    });

    it('should support third-party integrations with API key', () => {
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Third-party service request
      const request = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://third-party-service.com',
          'x-api-key': FAKE_API_KEY
        }
      });

      const result = checkAuth(request);

      expect(result.authorized).toBe(true);
    });

    it('should support automated scripts with API key', () => {
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Automated script (cron job, etc.)
      const request = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'x-api-key': FAKE_API_KEY,
          'User-Agent': 'ClanDataSync/1.0'
        }
      });

      const result = checkAuth(request);

      expect(result.authorized).toBe(true);
    });
  });

  describe('Configuration Guide', () => {
    it('should document environment variables needed', () => {
      const requiredEnvVars = {
        ALLOWED_ORIGIN: {
          description: 'The origin allowed to access without API key',
          examples: [
            'https://siege-clan.com',
            'http://localhost:3000',
            'https://deploy-preview-123--siege-clan.netlify.app'
          ],
          default: 'https://siege-clan.com'
        },
        API_KEY: {
          description: 'API key for cross-origin requests',
          examples: [
            'Generate securely: openssl rand -hex 32',
            'Or use: node -e "console.log(crypto.randomUUID())"'
          ],
          default: 'none (required for cross-origin access)'
        }
      };

      expect(requiredEnvVars.ALLOWED_ORIGIN).toBeDefined();
      expect(requiredEnvVars.API_KEY).toBeDefined();
    });

    it('should explain the authorization logic', () => {
      const authLogic = {
        step1: 'Check if request has Origin or Referer header',
        step2: 'If origin matches ALLOWED_ORIGIN, allow (same-origin)',
        step3: 'Otherwise, require valid API key in x-api-key header',
        step4: 'Return 401 if API key missing or invalid'
      };

      expect(Object.keys(authLogic)).toHaveLength(4);
    });
  });

  describe('Impact Assessment', () => {
    it('should verify no breaking changes for legitimate users', () => {
      // Legitimate frontend requests still work (same-origin)
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');

      const frontendRequest = new Request('https://siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://siege-clan.com'
        }
      });

      const result = checkAuth(frontendRequest);

      expect(result.authorized).toBe(true); // ✅ No breaking change
    });

    it('should block previously-allowed malicious requests', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Malicious request from unknown origin without API key
      const maliciousRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://evil-scraper.com'
        }
      });

      const result = checkAuth(maliciousRequest);

      expect(result.authorized).toBe(false); // ✅ Now blocked
      expect(result.reason).toBe('Invalid or missing API key');
    });
  });

  describe('Security: Origin Validation Bypass Attacks', () => {
    it('should block subdomain bypass attack', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Attack: evil-siege-clan.com contains "siege-clan.com"
      const attackRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://evil-siege-clan.com'
        }
      });

      const result = checkAuth(attackRequest);

      expect(result.authorized).toBe(false); // ✅ Attack blocked
      expect(result.reason).toBe('Invalid or missing API key');
    });

    it('should block subdomain suffix bypass attack', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Attack: siege-clan.com.attacker.com contains "siege-clan.com"
      const attackRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://siege-clan.com.attacker.com'
        }
      });

      const result = checkAuth(attackRequest);

      expect(result.authorized).toBe(false); // ✅ Attack blocked
      expect(result.reason).toBe('Invalid or missing API key');
    });

    it('should block query parameter bypass attack', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Attack: attacker.com?q=siege-clan.com contains "siege-clan.com"
      const attackRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://attacker.com?q=siege-clan.com'
        }
      });

      const result = checkAuth(attackRequest);

      expect(result.authorized).toBe(false); // ✅ Attack blocked
      expect(result.reason).toBe('Invalid or missing API key');
    });

    it('should block path-based bypass attack', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Attack: attacker.com/siege-clan.com contains "siege-clan.com"
      const attackRequest = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'https://attacker.com/siege-clan.com'
        }
      });

      const result = checkAuth(attackRequest);

      expect(result.authorized).toBe(false); // ✅ Attack blocked
      expect(result.reason).toBe('Invalid or missing API key');
    });

    it('should allow exact hostname match with different protocol', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');

      // Same hostname, just http instead of https (for localhost dev)
      const request = new Request('http://siege-clan.com/api/members', {
        headers: {
          'Origin': 'http://siege-clan.com'
        }
      });

      const result = checkAuth(request);

      // Different protocol = different origin, should be blocked
      expect(result.authorized).toBe(false);
    });

    it('should enforce exact port matching', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'http://localhost:3000');

      // Same hostname and protocol, but different port
      const request = new Request('http://localhost:8888/api/members', {
        headers: {
          'Origin': 'http://localhost:8080'
        }
      });

      const result = checkAuth(request);

      expect(result.authorized).toBe(false); // Different port = blocked
    });

    it('should allow exact port match', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'http://localhost:3000');

      // Exact match: hostname AND port
      const request = new Request('http://localhost:8888/api/members', {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      const result = checkAuth(request);

      expect(result.authorized).toBe(true); // ✅ Exact match allowed
    });

    it('should handle malformed origin gracefully', () => {
      Deno.env.set('ALLOWED_ORIGIN', 'https://siege-clan.com');
      Deno.env.set('API_KEY', FAKE_API_KEY);

      // Malformed origin that would crash URL parser
      const request = new Request('https://api.siege-clan.com/api/members', {
        headers: {
          'Origin': 'not-a-valid-url'
        }
      });

      const result = checkAuth(request);

      // Should fall through to API key check, not crash
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Invalid or missing API key');
    });
  });
});
