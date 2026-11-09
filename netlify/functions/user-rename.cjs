const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { renameUser, RenameError } = require('./utils/renameUser.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/user-rename  { username }
 *
 * Lets a signed-in member change their own username, e.g. if they used their
 * real name. The caller is whoever the Supabase session token belongs to;
 * there is no way to name another account. Admin status is not required.
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
      return reply(401, { error: 'Sign in to change your username.' });
    }
    const { data, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !data?.user) {
      return reply(401, { error: 'Your session has expired. Sign in again.' });
    }

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });

    const result = await renameUser({
      supabase,
      authUser: data.user,
      newUsername: parsed.data.username,
    });
    return reply(200, result);
  } catch (error) {
    if (error instanceof RenameError) return reply(error.statusCode, { error: error.message });
    return errorResponse(error, origin, 'Failed to change username');
  }
};
