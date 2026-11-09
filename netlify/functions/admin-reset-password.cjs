const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { resetPassword, PasswordError } = require('./utils/passwords.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/admin-reset-password  { userId }
 *
 * Admin only (validateAuth). Gives the member a new random password and
 * returns it once, for the admin to pass on. The member can then change it
 * from their Account tab (user-change-password).
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    const authError = await validateAuth(event);
    if (authError) return authError;

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });

    const result = await resetPassword(supabase, parsed.data.userId);
    // Never cached: the response carries a password.
    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error instanceof PasswordError) return reply(error.statusCode, { error: error.message });
    return errorResponse(error, origin, 'Failed to reset password');
  }
};
