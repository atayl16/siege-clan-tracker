/**
 * CORS Helpers for Netlify Functions
 * Validates and provides CORS headers with wildcard protection
 */

/**
 * Get validated ALLOWED_ORIGIN value
 * Throws an error if wildcard '*' is detected
 * @returns {string} Validated allowed origin
 * @throws {Error} If ALLOWED_ORIGIN is set to wildcard
 */
function getValidatedAllowedOrigin() {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siegeclan.com';

  // Security check: prevent wildcard CORS
  if (allowedOrigin === '*') {
    throw new Error('ALLOWED_ORIGIN cannot be set to wildcard "*". This bypasses CORS protection.');
  }

  // Additional validation: ensure it's a proper origin format
  const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?$/;
  if (!validOriginPattern.test(allowedOrigin)) {
    throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must be a valid origin (e.g., https://example.com)`);
  }

  return allowedOrigin;
}

/**
 * Get CORS headers for responses
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} CORS headers object
 */
function getCorsHeaders(additionalHeaders = {}) {
  const allowedOrigin = getValidatedAllowedOrigin();

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
}

module.exports = {
  getValidatedAllowedOrigin,
  getCorsHeaders
};
