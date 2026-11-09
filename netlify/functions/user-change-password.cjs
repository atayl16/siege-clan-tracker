const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { changeOwnPassword, PasswordError } = require('./utils/passwords.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/user-change-password  { currentPassword, newPassword }
 *
 * A signed-in member changes their own password, e.g. after an admin reset.
 * The account is whoever the Supabase session token belongs to, and the
 * current password must match.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return reply(401, { error: 'Sign in to change your password.' });
    }
    const { data, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !data?.user) {
      return reply(401, { error: 'Your session has expired. Sign in again.' });
    }

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });

    const { currentPassword, newPassword } = parsed.data;
    const result = await changeOwnPassword(supabase, data.user, currentPassword, newPassword);
    return reply(200, result);
  } catch (error) {
    if (error instanceof PasswordError) return reply(error.statusCode, { error: error.message });
    return errorResponse(error, origin, 'Failed to change password');
  }
};
