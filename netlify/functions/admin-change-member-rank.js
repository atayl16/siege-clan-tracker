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
    const authError = await validateAuth(event);
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

    const { memberId, newRank } = parseResult.data;

    // Validate required fields
    if (!memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Member ID is required' }),
      };
    }

    if (!newRank) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'New rank is required' }),
      };
    }

    // Change member rank using RPC call
    const { data, error } = await supabase.rpc(
      'admin_change_member_rank',
      {
        member_id: memberId,
        new_role: newRank
      }
    );

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to change member rank');
  }
};
