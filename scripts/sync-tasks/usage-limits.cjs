/**
 * Free-tier usage: limits, month-end projections and warning levels.
 *
 * Pure functions, so the thresholds can be tested without calling Netlify,
 * Supabase or GitHub. usage-check.cjs does the reading and writing.
 *
 * Two kinds of metric:
 *   - cumulative: counts up through the billing period and resets
 *     (Netlify build minutes, bandwidth). Projected to the period's end from
 *     the daily rate so far.
 *   - gauge: a size at a point in time (Supabase database size). Projected
 *     30 days ahead from its growth over the snapshots we already keep.
 *
 * Levels:
 *   - watch:   50% used, or projected to pass 80%. Shown on the admin Alerts
 *              tab only.
 *   - problem: 80% used, or projected to pass 100%. Also opens a GitHub issue,
 *              once per metric per billing period.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const THRESHOLDS = {
  watch: { used: 0.5, projected: 0.8 },
  problem: { used: 0.8, projected: 1.0 },
};

// A projection from the first day or two of a period is mostly noise: three
// builds on day one projects to the whole month's build minutes. Until this
// many days have passed (or, for a gauge, of history exists) the level comes
// from what is used, not from the projection.
const MIN_DAYS_FOR_PROJECTION = 5;

// How far ahead a gauge is projected. Its limit has no billing period we can
// read, so a month is the horizon.
const GAUGE_HORIZON_DAYS = 30;

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/**
 * The metrics the check reads. `fallbackLimit` is used only when the provider
 * does not say what is included.
 */
const METRICS = {
  netlify_build_minutes: {
    label: 'Netlify Build Minutes',
    provider: 'Netlify',
    kind: 'cumulative',
    unit: 'minutes',
    fallbackLimit: 300,
    dashboard: 'https://app.netlify.com/teams/{team}/billing/usage',
    dashboardPage: 'Usage & Billing',
  },
  netlify_bandwidth: {
    label: 'Netlify Bandwidth',
    provider: 'Netlify',
    kind: 'cumulative',
    unit: 'bytes',
    fallbackLimit: 100 * GB,
    dashboard: 'https://app.netlify.com/teams/{team}/billing/usage',
    dashboardPage: 'Usage & Billing',
  },
  supabase_database_size: {
    label: 'Supabase Database Size',
    provider: 'Supabase',
    kind: 'gauge',
    unit: 'bytes',
    fallbackLimit: 500 * MB,
    dashboard: 'https://supabase.com/dashboard/org/_/usage',
    dashboardPage: 'Usage',
  },
};

/** Limits no API reports, named in every warning so they are not forgotten. */
const UNREADABLE = [
  'Supabase egress and cached egress (5 GB each)',
  'Netlify function invocations (125,000) and edge function invocations (1,000,000)',
];

function daysBetween(from, to) {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS;
}

/**
 * Month-end figure for a cumulative metric, from the daily rate so far.
 * Null when the period dates are missing or the period has barely started.
 */
function projectCumulative({ used, periodStart, periodEnd, now }) {
  if (!periodStart || !periodEnd) return null;
  const total = daysBetween(periodStart, periodEnd);
  const elapsed = daysBetween(periodStart, now);
  if (!(total > 0) || elapsed < MIN_DAYS_FOR_PROJECTION) return null;
  if (elapsed >= total) return used;
  return (used / elapsed) * total;
}

/**
 * A gauge's figure GAUGE_HORIZON_DAYS from now, from its growth since the
 * oldest earlier reading. Null without enough history. A gauge that shrank
 * is projected flat, never downwards.
 */
function projectGauge({ used, now, history = [] }) {
  const earlier = history
    .filter((h) => Number.isFinite(h.used) && daysBetween(h.taken_on, now) >= MIN_DAYS_FOR_PROJECTION)
    .sort((a, b) => new Date(a.taken_on) - new Date(b.taken_on))[0];
  if (!earlier) return null;
  const perDay = (used - earlier.used) / daysBetween(earlier.taken_on, now);
  return used + Math.max(0, perDay) * GAUGE_HORIZON_DAYS;
}

function levelFor({ used, limit, projected }) {
  const usedShare = used / limit;
  const projectedShare = projected == null ? 0 : projected / limit;
  for (const level of ['problem', 'watch']) {
    const t = THRESHOLDS[level];
    if (usedShare >= t.used || projectedShare >= t.projected) return level;
  }
  return 'ok';
}

/**
 * Turn one reading into the row the admin page shows and the check stores.
 *
 * @param {object} reading
 * @param {string} reading.metric - a key of METRICS
 * @param {number} reading.used
 * @param {number} [reading.limit] - what the provider says is included
 * @param {string} [reading.periodStart] - ISO date, cumulative metrics
 * @param {string} [reading.periodEnd]
 * @param {Date|string} now
 * @param {Array<{taken_on: string, used: number}>} [history] - gauge only
 */
function evaluate(reading, now, history = []) {
  const def = METRICS[reading.metric];
  if (!def) throw new Error(`Unknown usage metric: ${reading.metric}`);
  const used = Number(reading.used);
  if (!Number.isFinite(used) || used < 0) {
    throw new Error(`${def.label}: unreadable usage figure ${reading.used}`);
  }
  const limit = Number(reading.limit) > 0 ? Number(reading.limit) : def.fallbackLimit;

  const projected =
    def.kind === 'cumulative'
      ? projectCumulative({ used, periodStart: reading.periodStart, periodEnd: reading.periodEnd, now })
      : projectGauge({ used, now, history });

  return {
    metric: reading.metric,
    used,
    usage_limit: limit,
    unit: def.unit,
    period_start: reading.periodStart ? toDate(reading.periodStart) : null,
    period_end: reading.periodEnd ? toDate(reading.periodEnd) : null,
    projected: projected == null ? null : Math.round(projected),
    level: levelFor({ used, limit, projected }),
  };
}

function toDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

/** "1.4 GB", "312 MB", "290 minutes". */
function formatAmount(value, unit) {
  if (unit === 'bytes') {
    if (value >= GB) return `${(value / GB).toFixed(1)} GB`;
    return `${Math.round(value / MB)} MB`;
  }
  return `${Math.round(value).toLocaleString('en-GB')} ${unit}`;
}

/**
 * Where to look. Without a Netlify team slug, the Netlify home page, which
 * opens on the team. Supabase's `_` stands for "your organisation".
 */
function dashboardUrl(def, team) {
  if (!def.dashboard.includes('{team}')) return def.dashboard;
  return team ? def.dashboard.replace('{team}', encodeURIComponent(team)) : 'https://app.netlify.com';
}

function percent(value, limit) {
  return `${Math.round((value / limit) * 100)}%`;
}

/**
 * GitHub issue title. It names the billing period (the calendar month for a
 * gauge), so one issue covers a metric for a whole period however many times
 * the check runs, and a new period gets a new issue.
 */
function issueTitle(row, now) {
  const period = row.period_start || toDate(now).slice(0, 7);
  return `Free-tier usage: ${METRICS[row.metric].label} near the limit (period from ${period})`;
}

// Issues are public, and the Netlify team slug is the owner's email name, so
// the issue links the Netlify home page rather than the team's billing page.
function issueBody(row) {
  const def = METRICS[row.metric];
  const lines = [
    `**${def.label}** is at ${formatAmount(row.used, row.unit)} of ${formatAmount(row.usage_limit, row.unit)} (${percent(row.used, row.usage_limit)}).`,
  ];
  if (row.projected != null) {
    const when = def.kind === 'cumulative' ? `by ${row.period_end}, when the period resets` : `in ${GAUGE_HORIZON_DAYS} days`;
    lines.push(`At the current rate it reaches ${formatAmount(row.projected, row.unit)} (${percent(row.projected, row.usage_limit)}) ${when}.`);
  }
  if (row.period_start && row.period_end) {
    lines.push(`Billing period: ${row.period_start} to ${row.period_end}.`);
  }
  lines.push(
    '',
    `Check it: ${dashboardUrl(def, null)} (${def.dashboardPage})`,
    '',
    'Not checked automatically, because neither provider reports them by API:',
    ...UNREADABLE.map((item) => `- ${item}`),
    '',
    'Opened by the Usage Check workflow (scripts/sync-tasks/usage-check.cjs). It opens one issue per limit per billing period; closing this one will not bring it back this period.',
  );
  return lines.join('\n');
}

module.exports = {
  METRICS,
  THRESHOLDS,
  UNREADABLE,
  MIN_DAYS_FOR_PROJECTION,
  GAUGE_HORIZON_DAYS,
  projectCumulative,
  projectGauge,
  levelFor,
  evaluate,
  formatAmount,
  dashboardUrl,
  issueTitle,
  issueBody,
};
