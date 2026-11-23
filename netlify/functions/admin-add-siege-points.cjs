const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Add (or with a negative number, remove) Siege Score points for one member.
 * The addition happens in the database, so an Admin page loaded before an
 * award cannot write its older score back over the award, as setting the
 * whole score from the page's copy could.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const bad = (message) => ({ statusCode: 400, headers, body: JSON.stringify({ error: message }) });

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const authError = await validateAuth(event);
    if (authError) return authError;

    const parsed = parseRequestBody(event.body);
    if (parsed.error) {
      return { statusCode: parsed.statusCode, headers, body: JSON.stringify({ error: parsed.error }) };
    }

    const { memberId, points } = parsed.data;
    if (!Number.isInteger(Number(memberId)) || Number(memberId) <= 0) return bad('Member ID is required');
    if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 1000) {
      return bad('points must be a whole number between -1000 and 1000, and not 0');
    }

    const { data, error } = await supabase.rpc('admin_add_siege_points', {
      member_id: Number(memberId),
      points,
    });
    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, siegeScore: data }) };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to add Siege Score points');
  }
};
