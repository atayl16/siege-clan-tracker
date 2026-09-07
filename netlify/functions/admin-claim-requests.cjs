const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Every claim request, for the admin views.
 *
 * claim_requests is scoped to the owner by RLS (claim_requests_read_own), so a
 * browser can only ever see its own. Admin needs all of them, which is what the
 * service role is for - the same pattern as the other admin-* functions, and
 * the reason this is not just another supabase-js call from the client.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const authError = await validateAuth(event);
    if (authError) return authError;

    const { data, error } = await supabase
      .from('claim_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to load claim requests');
  }
};
