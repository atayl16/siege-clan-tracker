/**
 * Username-Based Login Edge Function
 *
 * Purpose: Enables username-based login while using Supabase Auth (which requires emails)
 *
 * Flow:
 * 1. Accepts username + password from client
 * 2. Looks up email by username in database (using service role)
 * 3. Authenticates with Supabase using email + password (using anon key)
 * 4. Returns session tokens + user data to client
 *
 * Security:
 * - Service role key used only for username->email lookup
 * - Actual authentication uses anon key (proper auth flow)
 * - Email addresses not exposed to client during lookup
 * - CORS restricted to allowed origins
 */

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role for user lookup
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create client with anon key for actual auth
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:8888'];

/**
 * Get CORS headers for response
 */
function getCorsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

/**
 * Main handler
 */
exports.handler = async function(event, context) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' })
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { username, password } = requestBody;

    // Validate inputs
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username and password required' })
      };
    }

    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    console.log(`Login attempt for username: ${normalizedUsername}`);

    // Step 1: Look up email by username using service role
    // This bypasses RLS policies for the lookup
    const { data: userData, error: lookupError } = await supabaseService
      .from('users')
      .select('email, id, username, is_admin')
      .eq('username', normalizedUsername)
      .single();

    if (lookupError || !userData) {
      console.error('Username lookup failed:', lookupError?.message || 'User not found');
      // Use generic error message to avoid username enumeration
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    console.log(`Found user ${normalizedUsername}, attempting auth with email: ${userData.email}`);

    // Step 2: Authenticate with Supabase using email + password
    // This uses the anon key (proper auth flow)
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: userData.email,
      password: password
    });

    if (authError) {
      console.error('Auth error:', authError.message);
      // Generic error to avoid leaking info
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Verify we got session and user data
    if (!authData.session || !authData.user) {
      console.error('Auth succeeded but missing session/user data');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }

    console.log(`Login successful for user: ${normalizedUsername}`);

    // Step 3: Return session and user data to client
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_in: authData.session.expires_in,
          expires_at: authData.session.expires_at
        },
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          is_admin: userData.is_admin
        }
      })
    };
  } catch (error) {
    console.error('Unexpected login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
