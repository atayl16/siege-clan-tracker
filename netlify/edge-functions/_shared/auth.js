/**
 * Authentication middleware for edge functions
 * Validates API key for all requests using constant-time comparison
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * Processes all bytes regardless of length or null values to prevent timing side-channels
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(typeof a === "string" ? a : "");
  const bufferB = encoder.encode(typeof b === "string" ? b : "");

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
 * Validate API key from request
 * Requires valid API key for all requests - no bypass for Origin/Referer headers
 * as those are attacker-controlled and trivially forgeable
 */
export function validateApiKey(request) {
  // Check for API key in header
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = Deno.env.get('API_KEY');

  // If no API key is configured in environment, allow request (backward compatibility)
  if (!expectedKey) {
    return { valid: true, reason: 'no-key-configured' };
  }

  // Validate API key using constant-time comparison to prevent timing attacks
  if (apiKey && constantTimeEqual(apiKey, expectedKey)) {
    return { valid: true, reason: 'valid-api-key' };
  }

  return { valid: false, reason: 'invalid-or-missing-api-key' };
}

/**
 * Create 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    }
  );
}

/**
 * Get CORS headers for responses
 */
export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}
