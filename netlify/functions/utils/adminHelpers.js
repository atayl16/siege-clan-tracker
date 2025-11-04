/**
 * Shared utilities for admin edge functions
 */

// CORS headers configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:8888']; // Development defaults

/**
 * Get CORS headers for the request
 * @param {string} requestOrigin - Origin from request headers
 * @returns {Object} CORS headers
 */
function getCorsHeaders(requestOrigin) {
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ||
                          requestOrigin?.endsWith('.netlify.app');

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? requestOrigin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

/**
 * Handle preflight CORS requests
 * @param {Object} event - Netlify function event
 * @returns {Object} Response object
 */
function handlePreflight(event) {
  const origin = event.headers.origin || event.headers.Origin;
  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({ message: 'Preflight call successful' }),
  };
}

/**
 * Validate that the request has proper authentication
 * Note: This is a basic check. In production, you should validate JWT tokens
 * or use Supabase auth to verify the user is actually an admin.
 *
 * @param {Object} event - Netlify function event
 * @returns {Object|null} Error response if invalid, null if valid
 */
function validateAuth(event) {
  // Check for Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
      body: JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
    };
  }

  // Basic Bearer token check
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
      body: JSON.stringify({ error: 'Unauthorized: Invalid authorization format' }),
    };
  }

  // TODO: In production, validate the JWT token here using Supabase
  // const token = authHeader.replace('Bearer ', '');
  // const { data: user, error } = await supabase.auth.getUser(token);
  // if (error || !user?.app_metadata?.is_admin) { return 401; }

  return null; // Valid
}

/**
 * Create error response with proper headers
 * @param {Error} error - Error object
 * @param {string} origin - Request origin
 * @param {string} genericMessage - Generic user-facing message
 * @returns {Object} Error response
 */
function errorResponse(error, origin, genericMessage = 'Internal server error') {
  console.error('Error:', error);
  return {
    statusCode: 500,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({ error: genericMessage }),
  };
}

/**
 * Parse and validate JSON request body
 * @param {string} body - Request body string
 * @returns {Object} Parsed body or error response
 */
function parseRequestBody(body) {
  try {
    if (!body) {
      return { error: 'Missing request body', statusCode: 400 };
    }
    return { data: JSON.parse(body) };
  } catch (parseError) {
    return { error: 'Invalid JSON in request body', statusCode: 400 };
  }
}

/**
 * Validate environment variables are set
 * @throws {Error} If required environment variables are missing
 */
function validateEnvironment() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

module.exports = {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
};
