const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers');

// Validate environment variables at module load
validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async function(event, context) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    // Only allow POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Validate authentication
    const authError = validateAuth(event);
    if (authError) {
      return authError;
    }

    // Parse request body
    const parseResult = parseRequestBody(event.body);
    if (parseResult.error) {
      return {
        statusCode: parseResult.statusCode,
        headers,
        body: JSON.stringify({ error: parseResult.error }),
      };
    }

    const { userId, isAdmin } = parseResult.data;

    // Validate required fields
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }

    if (typeof isAdmin !== 'boolean') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'isAdmin must be a boolean value' }),
      };
    }

    // Update user admin status using service role key (bypasses RLS)
    const { data, error } = await supabase
      .from('users')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select('id, username, is_admin, created_at');

    if (error) throw error;

    // Check if user was found
    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data[0] }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to update user admin status');
  }
};
