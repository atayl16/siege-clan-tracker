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
 * Reset every member's Siege Score to 0, former and hidden members included,
 * and record when (siege_score_resets), in one database transaction. The
 * Admin page used to send one update per listed member, which skipped
 * everyone the list leaves out.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const authError = await validateAuth(event);
    if (authError) return authError;

    const { data, error } = await supabase.rpc('admin_reset_siege_scores');
    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, resetCount: data }) };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to reset Siege Scores');
  }
};
