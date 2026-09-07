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

    // ClaimRequestManager renders request.username, and claim_requests only
    // stores user_id - so every row showed "Unknown User".
    //
    // Deliberately two queries rather than a PostgREST embed. Local has
    // claim_requests_user_id_fkey and production does not, so
    // `users:user_id(username)` works here and fails there with PGRST200. The
    // lookup below behaves the same either way.
    const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))];

    let usernameById = {};
    if (userIds.length) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);

      if (usersError) throw usersError;
      usernameById = Object.fromEntries(users.map((u) => [u.id, u.username]));
    }

    const withUsernames = (data ?? []).map((request) => ({
      ...request,
      username: usernameById[request.user_id] ?? null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: withUsernames }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to load claim requests');
  }
};
