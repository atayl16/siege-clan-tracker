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
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://siege-clan.com';

  // Security check: prevent wildcard CORS
  if (allowedOrigin === '*') {
    throw new Error('ALLOWED_ORIGIN cannot be set to wildcard "*". This bypasses CORS protection.');
  }

  // Additional validation: ensure it's a proper origin format using URL constructor
  try {
    const url = new URL(allowedOrigin);

    // Validate protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Invalid ALLOWED_ORIGIN protocol: ${allowedOrigin}. Must use http or https.`);
    }

    // Ensure no credentials
    if (url.username || url.password) {
      throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must not contain credentials.`);
    }

    // Validate port if present
    if (url.port) {
      const portNum = parseInt(url.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error(`Invalid ALLOWED_ORIGIN port: ${allowedOrigin}. Port must be between 1 and 65535.`);
      }
    }

    // Ensure no path, query, or fragment (must be origin only)
    if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
      throw new Error(`Invalid ALLOWED_ORIGIN format: ${allowedOrigin}. Must be an origin without path, query, or fragment.`);
    }
  } catch (err) {
    // Re-throw with formatted message if it's already our error, otherwise generic error
    if (err.message.includes('Invalid ALLOWED_ORIGIN')) {
      throw err;
    }
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
}

module.exports = {
  getValidatedAllowedOrigin,
  getCorsHeaders
};
