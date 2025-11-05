/**
 * Authentication middleware for edge functions
 * Validates API key for external requests while allowing same-origin requests
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeEqual(a, b) {
  // Handle null/undefined
  if (!a || !b) {
    return false;
  }

  // Length check first (safe to leak length info)
  if (a.length !== b.length) {
    return false;
  }

  // Use TextEncoder to convert strings to Uint8Array
  const encoder = new TextEncoder();
  const bufferA = encoder.encode(a);
  const bufferB = encoder.encode(b);

  // XOR all bytes and accumulate the result
  let result = 0;
  for (let i = 0; i < bufferA.length; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }

  // Return true only if all bits are zero
  return result === 0;
}

/**
 * Check if request is from same origin
 */
function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com';

  // Check origin header
  if (origin && origin === allowedOrigin) {
    return true;
  }

  // Check referer header
  if (referer && referer.startsWith(allowedOrigin)) {
    return true;
  }

  return false;
}

/**
 * Validate API key from request
 */
export function validateApiKey(request) {
  // Allow same-origin requests without API key
  if (isSameOrigin(request)) {
    return { valid: true, reason: 'same-origin' };
  }

  // Check for API key in header
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = Deno.env.get('API_KEY');

  // If no API key is configured in environment, allow request (backward compatibility)
  if (!expectedKey) {
    return { valid: true, reason: 'no-key-configured' };
  }

  // Validate API key using constant-time comparison to prevent timing attacks
  if (constantTimeEqual(apiKey, expectedKey)) {
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
