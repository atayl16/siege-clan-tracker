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

    const { memberId, reason } = parseResult.data;

    // Validate required fields
    if (!memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Member ID is required' }),
      };
    }

    // Update member whitelist status directly (service role bypasses RLS)
    const { data, error } = await supabase
      .from('members')
      .update({
        runewatch_whitelisted: true,
        runewatch_whitelist_reason: reason || 'Whitelisted by admin',
        updated_at: new Date().toISOString()
      })
      .eq('wom_id', memberId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Member not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data[0] }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to whitelist member');
  }
};
