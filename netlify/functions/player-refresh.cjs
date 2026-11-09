const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { fetchPlayer } = require('./utils/womPlayers.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/player-refresh  { womId }
 *
 * A player's current stats, pulled fresh from the hiscores by WiseOldMan.
 *
 * Creating a goal records its starting value, and WOM's saved snapshot can be
 * hours or days old, so XP gained since then would count as progress on the
 * new goal. The goal form and the goals Sync button call this instead of the
 * cached /api/wom-player.
 *
 * Signed-in members only: each call asks WOM to update a player, which spends
 * API quota. WOM itself refuses a second update of the same player within
 * about a minute; then, or if the hiscores are down, the saved snapshot comes
 * back with updated: false.
 *
 * Returns { womId, updated, latestSnapshot: { data } }, the shape the
 * goal code already reads from WOM player details. All of it is public WOM
 * data.
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
      return reply(401, { error: 'Sign in to get your latest stats.' });
    }
    const { data: auth, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !auth?.user) {
      return reply(401, { error: 'Your session has expired. Sign in again.' });
    }

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });
    const womId = String(parsed.data.womId ?? '');
    // Digits only: it goes into the WOM request path.
    if (!/^\d+$/.test(womId)) return reply(400, { error: 'Missing or invalid player ID' });

    // Two WOM calls in a row (look up, then update), each capped so the pair
    // stays inside Netlify's ten seconds.
    const { data, updated } = await fetchPlayer(Number(womId), {
      force: true,
      apiKey: process.env.WOM_API_KEY,
      timeoutMs: 4000,
    });
    if (!data) return reply(502, { error: 'Could not get stats from WiseOldMan. Try again shortly.' });

    return reply(200, { womId: Number(womId), updated, latestSnapshot: { data } });
  } catch (error) {
    return errorResponse(error, origin, 'Failed to get player stats');
  }
};
