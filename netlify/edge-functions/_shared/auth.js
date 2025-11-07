/**
 * Shared Authentication Middleware for Edge Functions
 *
 * Provides API key authentication for edge functions to prevent abuse.
 * Allows same-origin requests without API key for legitimate frontend access.
 */

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
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com';

  // Allow same-origin requests without API key
  if (origin && origin.includes(allowedOrigin.replace('https://', '').replace('http://', ''))) {
    return { authorized: true };
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

  // Verify API key matches
  if (apiKey !== expectedKey) {
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
