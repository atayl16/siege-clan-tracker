/**
 * Shared Authentication Middleware for Edge Functions
 *
 * Provides API key authentication for edge functions to prevent abuse.
 * Allows same-origin requests without API key for legitimate frontend access.
 */

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Timing attacks can occur when string comparison operations short-circuit
 * on the first mismatch, allowing attackers to deduce parts of the secret
 * by measuring response times.
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings are equal
 */
function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(typeof a === 'string' ? a : '');
  const bufferB = encoder.encode(typeof b === 'string' ? b : '');

  const maxLength = Math.max(bufferA.length, bufferB.length);
  let mismatch = bufferA.length === bufferB.length ? 0 : 1;

  for (let i = 0; i < maxLength; i++) {
    const byteA = bufferA[i] ?? 0;
    const byteB = bufferB[i] ?? 0;
    mismatch |= byteA ^ byteB;
  }

  return mismatch === 0;
}

/**
 * Check if a request is authorized
 *
 * Authorization logic:
 * 1. Same-origin requests are always allowed (frontend accessing its own API)
 * 2. Cross-origin requests require valid API key in x-api-key header
 *
 * @param {Request} request - The incoming request
 * @returns {{ authorized: boolean, reason?: string }} Authorization result
 */
export function checkAuth(request) {
  // Get origin from request headers
  const origin = request.headers.get('Origin') || request.headers.get('Referer');
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://www.siege-clan.com';

  // Allow same-origin requests without API key
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowedOrigin);

      // Normalize hostnames by removing www. prefix for comparison
      const normalizeHostname = (hostname) => hostname.replace(/^www\./, '');
      const originHostname = normalizeHostname(originUrl.hostname);
      const allowedHostname = normalizeHostname(allowedUrl.hostname);

      // Allow Netlify deploy previews and localhost
      const isNetlifyDeploy = originHostname.endsWith('.netlify.app');
      const isLocalhost = originHostname === 'localhost' || originHostname === '127.0.0.1';

      // Match normalized hostnames (allows both www and non-www) OR Netlify deploys OR localhost
      if (isNetlifyDeploy || isLocalhost ||
          (originHostname === allowedHostname &&
          (originUrl.port || (originUrl.protocol === 'https:' ? '443' : '80')) ===
          (allowedUrl.port || (allowedUrl.protocol === 'https:' ? '443' : '80')))) {
        return { authorized: true };
      }
    } catch (e) {
      // Invalid URL format, fall through to API key check
    }
  }

  // Cross-origin requests require API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = Deno.env.get('API_KEY');

  // If no API key is configured, deny all cross-origin requests
  if (!expectedKey) {
    return {
      authorized: false,
      reason: 'API key authentication not configured'
    };
  }

  // Verify API key matches using constant-time comparison
  if (!apiKey || !constantTimeEqual(apiKey, expectedKey)) {
    return {
      authorized: false,
      reason: 'Invalid or missing API key'
    };
  }

  return { authorized: true };
}

/**
 * Create an unauthorized response
 *
 * @param {string} reason - Reason for unauthorized access
 * @returns {Response} 401 Unauthorized response
 */
export function unauthorizedResponse(reason = 'Unauthorized') {
  return new Response(
    JSON.stringify({ error: reason }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
