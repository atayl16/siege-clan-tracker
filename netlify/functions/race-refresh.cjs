const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  errorResponse,
  parseRequestBody,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { refreshRaces, RaceRefreshError } = require('./utils/raceProgress.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /.netlify/functions/race-refresh  { raceIds: string[], force?: boolean }
 *
 * Brings race progress up to date from WiseOldMan, so the races page does not
 * have to wait for the hourly sync (which GitHub often runs hours late).
 *
 * - The page calls it with force false when it opens: anyone may, signed in
 *   or not. It only re-reads WOM's stored stats and writes derived progress,
 *   at most once per race every few minutes.
 * - The Refresh button sends force true, which also asks WOM to pull fresh
 *   hiscores. That spends WOM API quota, so it needs a signed-in member.
 *
 * Nothing about the races is returned beyond what happened to each one; the
 * page re-reads races through its own RLS-checked query.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  try {
    if (event.httpMethod === 'OPTIONS') return handlePreflight(event);
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    const parsed = parseRequestBody(event.body);
    if (parsed.error) return reply(parsed.statusCode, { error: parsed.error });
    const { raceIds, force } = parsed.data;

    if (force) {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return reply(401, { error: 'Sign in to refresh a race.' });
      }
      const { data, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
      if (authError || !data?.user) {
        return reply(401, { error: 'Your session has expired. Sign in again.' });
      }
    }

    const result = await refreshRaces({
      supabase,
      raceIds,
      force: force === true,
      apiKey: process.env.WOM_API_KEY,
      log: console.warn,
    });
    return reply(200, result);
  } catch (error) {
    if (error instanceof RaceRefreshError) return reply(error.statusCode, { error: error.message });
    return errorResponse(error, origin, 'Failed to refresh race progress');
  }
};
