const { createClient } = require('@supabase/supabase-js');
const {
  getCorsHeaders,
  handlePreflight,
  validateAuth,
  errorResponse,
  validateEnvironment,
} = require('./utils/adminHelpers.cjs');
const { METRICS, UNREADABLE, dashboardUrl, formatAmount } = require('../../scripts/sync-tasks/usage-limits.cjs');

validateEnvironment();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Enough to find each metric's latest row even if the check has missed a
// couple of weeks of runs.
const LOOKBACK_DAYS = 21;

/** Numbers arrive from PostgREST as strings (NUMERIC); add display text. */
function withText(row) {
  const used = Number(row.used);
  const limit = Number(row.usage_limit);
  const projected = row.projected == null ? null : Number(row.projected);
  return {
    ...row,
    used,
    usage_limit: limit,
    projected,
    used_text: formatAmount(used, row.unit),
    limit_text: formatAmount(limit, row.unit),
    projected_text: projected == null ? null : formatAmount(projected, row.unit),
  };
}

/**
 * Every known metric with its newest snapshot, or null when it has none.
 * Rows arrive newest first.
 */
function usageMetrics(rows) {
  const latest = {};
  for (const row of rows ?? []) {
    if (!latest[row.metric]) latest[row.metric] = row;
  }
  return Object.entries(METRICS).map(([metric, def]) => ({
    metric,
    label: def.label,
    kind: def.kind,
    provider: def.provider,
    // A Netlify env var, not code: the slug is the owner's email name and
    // the repo is public. Without it the link opens the Netlify home page.
    dashboard: dashboardUrl(def, process.env.NETLIFY_TEAM_SLUG),
    dashboardPage: def.dashboardPage,
    snapshot: latest[metric] ? withText(latest[metric]) : null,
  }));
}

/**
 * Free-tier usage for the admin Alerts tab: the latest snapshot of each
 * metric the Usage Check workflow stores, plus the metric list, so the page
 * can say which have no reading yet.
 *
 * usage_snapshots is service role only (RLS on, no policies), so this goes
 * through a function like the other admin reads. One small query; called
 * only when an admin opens the Alerts tab.
 */
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'OPTIONS') {
      return handlePreflight(event);
    }

    const authError = await validateAuth(event);
    if (authError) return authError;

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from('usage_snapshots')
      .select('metric, taken_on, used, usage_limit, unit, period_start, period_end, projected, level, checked_at')
      .gte('taken_on', since)
      .order('taken_on', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { metrics: usageMetrics(data), unreadable: UNREADABLE } }),
    };
  } catch (error) {
    return errorResponse(error, origin, 'Failed to load usage');
  }
};

exports.usageMetrics = usageMetrics;
