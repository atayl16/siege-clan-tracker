/**
 * Authentication middleware for edge functions
 * Validates API key for external requests while allowing same-origin requests
 */

/**
 * Check if request is from same origin
 * Uses strict origin comparison to prevent host-shadowing attacks
 */
function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://siegeclan.com';

  // Normalize the allowed origin to ensure it includes scheme and has no trailing slash
  const expectedOrigin = (() => {
    try {
      const url = new URL(allowedOrigin);
      return url.origin; // This gives us scheme + host + port (no trailing slash)
    } catch (_err) {
      // If allowedOrigin is not a valid URL, ensure it has https:// and no trailing slash
      const normalized = allowedOrigin.startsWith('http')
        ? allowedOrigin
        : `https://${allowedOrigin}`;
      return normalized.replace(/\/$/, '');
    }
  })();

  // Check origin header (exact match)
  if (origin && origin === expectedOrigin) {
    return true;
  }

  // Check referer header (parse and compare origin)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (refererOrigin === expectedOrigin) {
        return true;
      }
    } catch (_err) {
      // Invalid referer URL, ignore it
    }
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

  // Validate API key
  if (apiKey === expectedKey) {
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
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siegeclan.com',
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
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siegeclan.com',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}
