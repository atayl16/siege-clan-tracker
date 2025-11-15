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
 * All requests require valid API key in x-api-key header
 * No origin-based bypasses to prevent header spoofing attacks
 *
 * @param {Request} request - The incoming request
 * @returns {{ authorized: boolean, reason?: string }} Authorization result
 */
export function checkAuth(request) {
  // All requests require API key - no origin-based bypass
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = Deno.env.get('API_KEY');

  // If no API key is configured, deny all requests
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
