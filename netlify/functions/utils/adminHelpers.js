/**
 * Shared utilities for admin edge functions
 */

const { createClient } = require('@supabase/supabase-js');

// CORS headers configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:8888']; // Development defaults

/**
 * Get CORS headers for the request
 * @param {string} requestOrigin - Origin from request headers
 * @returns {Object} CORS headers
 */
function getCorsHeaders(requestOrigin) {
  // Only allow explicitly listed origins - no wildcards
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin);

  // Defensive check for empty ALLOWED_ORIGINS
  const fallbackOrigin = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS[0] : 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? requestOrigin : fallbackOrigin,
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
 * Validate that the request has proper authentication and admin privileges
 *
 * Authorization logic:
 * All requests require valid JWT Bearer token - no origin-based bypass
 *
 * @param {Object} event - Netlify function event
 * @returns {Promise<Object|null>} Error response if invalid, null if valid
 */
async function validateAuth(event) {
  const origin = event.headers.origin || event.headers.Origin;

  // All requests require Authorization header - no origin-based bypass
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader) {
    return {
      statusCode: 401,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
    };
  }

  // Basic Bearer token check
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Unauthorized: Invalid authorization format' }),
    };
  }

  // Validate the JWT token using Supabase
  try {
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('JWT validation failed:', error?.message || 'No user found');
      return {
        statusCode: 401,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      };
    }

    // Check if user has admin privileges in the database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('supabase_auth_id', user.id)
      .single();

    if (dbError || !userData || !userData.is_admin) {
      console.error('Admin check failed:', dbError?.message || 'User not admin');
      return {
        statusCode: 403,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
      };
    }

    // Valid admin user
    return null;
  } catch (validationError) {
    console.error('Auth validation error:', validationError);
    return {
      statusCode: 401,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Unauthorized: Token validation failed' }),
    };
  }
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
