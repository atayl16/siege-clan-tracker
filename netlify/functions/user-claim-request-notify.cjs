const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { alertClaimRequest, AlertError } = require('./utils/claimRequestAlert.cjs');
const { postMessage } = require('../../scripts/comp-polls/discord.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/user-claim-request-notify  { requestId }
 *
 * Called by the site right after a member saves a claim request. Posts it to
 * the staff Discord channel so an admin knows to approve it. The caller is
 * whoever the Supabase session token belongs to, and can only announce their
 * own pending request, once.
 *
 * Env: DISCORD_BOT_TOKEN, DISCORD_STAFF_CHANNEL_ID (read per request). With
 * no channel set it posts nothing, so the site works before it is set up.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) return reply(401, { error: 'Sign in first.' });
    const { data, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !data?.user) return reply(401, { error: 'Your session has expired. Sign in again.' });

    const channelId = process.env.DISCORD_STAFF_CHANNEL_ID;
    if (!channelId) {
      console.warn('user-claim-request-notify: DISCORD_STAFF_CHANNEL_ID is not set; nothing posted');
      return reply(200, { notified: false, reason: 'not set up' });
    }

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });

    const result = await alertClaimRequest({
      supabase,
      authUser: data.user,
      requestId: parsed.data.requestId,
      channelId,
      postMessage: (channel, message) => postMessage(channel, message, { timeoutMs: 8000, retries: 1 }),
    });
    return reply(200, result);
  } catch (error) {
    if (error instanceof AlertError) return reply(error.statusCode, { error: error.message });
    return errorResponse(error, origin, 'Could not tell the staff channel about your request');
  }
};
