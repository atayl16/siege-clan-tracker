/**
 * Free-tier usage check. Reads what Netlify and Supabase report, stores one
 * snapshot per metric per day for the admin Alerts tab, and opens a GitHub
 * issue when a limit is close (see usage-limits.cjs for the levels).
 *
 * What it reads:
 *   - Netlify build minutes: GET /api/v1/{account_id}/builds/status
 *     (documented).
 *   - Netlify bandwidth: GET /api/v1/accounts/{slug}/bandwidth. Undocumented,
 *     so a failure here is logged and skipped rather than failing the run.
 *   - Supabase database size: the usage_database_bytes() function, called
 *     with the service role.
 * What it cannot read (no API): Supabase egress, Netlify function and
 * edge-function invocations. Every issue names those.
 *
 * Safe to run late, twice, or not at all for a few days: snapshots upsert on
 * (metric, day), and an issue opens once per metric per billing period, found
 * again by its title, open or closed.
 *
 * Cost: plain fetch, no npm install. Per run, three Netlify API calls (not
 * counted against the site's limits), four small Supabase requests, and
 * GitHub API calls only when a limit is close. No Netlify function or
 * edge-function invocations.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN,
 *      GITHUB_REPOSITORY. Optional: GITHUB_ASSIGNEE (who the issue is
 *      assigned to), NETLIFY_USAGE_TOKEN (without it Netlify is skipped),
 *      NETLIFY_ACCOUNT_SLUG (needed only if the token sees more than one team).
 */

const { evaluate, issueTitle, issueBody, formatAmount, METRICS } = require('./usage-limits.cjs');

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const GITHUB_API = 'https://api.github.com';
// Snapshots older than this are deleted. A gauge needs only the last month
// for its projection; the rest is a year of history for the admin page.
const KEEP_DAYS = 400;
const HISTORY_DAYS = 35;

class HttpError extends Error {
  constructor(what, status, text) {
    super(`${what}: HTTP ${status}${text ? ` ${text.slice(0, 200)}` : ''}`);
    this.status = status;
  }
}

async function getJson(fetchImpl, url, init, what) {
  const res = await fetchImpl(url, init);
  if (!res.ok) throw new HttpError(what, res.status, await res.text().catch(() => ''));
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* Netlify ----------------------------------------------------------------- */

function pickAccount(accounts, slug) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Netlify: the token sees no teams');
  }
  if (slug) {
    const match = accounts.find((a) => a.slug === slug);
    // The slug stays out of the message: Actions logs on this repo are public.
    if (!match) throw new Error('Netlify: no team matches NETLIFY_ACCOUNT_SLUG');
    return match;
  }
  if (accounts.length > 1) {
    throw new Error('Netlify: the token sees more than one team; set NETLIFY_ACCOUNT_SLUG');
  }
  return accounts[0];
}

/** builds/status is documented as an array; accept a bare object too. */
function buildMinutesReading(status) {
  const entry = (Array.isArray(status) ? status : [status]).find((s) => s && s.minutes);
  if (!entry) throw new Error('Netlify: builds/status has no minutes figure');
  const m = entry.minutes;
  return {
    metric: 'netlify_build_minutes',
    used: Number(m.current),
    limit: Number(m.included_minutes_with_packs || m.included_minutes),
    periodStart: m.period_start_date,
    periodEnd: m.period_end_date,
  };
}

function bandwidthReading(body) {
  if (!body || !Number.isFinite(Number(body.used))) {
    throw new Error('Netlify: bandwidth response has no "used" figure');
  }
  return {
    metric: 'netlify_bandwidth',
    used: Number(body.used),
    limit: Number(body.included),
    periodStart: body.period_start_date,
    periodEnd: body.period_end_date,
  };
}

/**
 * @returns {Promise<{readings: object[], failures: string[], warnings: string[]}>}
 *   failures fail the run (GitHub emails the owner); warnings do not.
 */
async function readNetlify({ fetchImpl, token, accountSlug }) {
  const result = { readings: [], failures: [], warnings: [] };
  if (!token) {
    result.warnings.push('NETLIFY_USAGE_TOKEN is not set, so Netlify was skipped');
    return result;
  }
  const init = { headers: { Authorization: `Bearer ${token}` } };

  let account;
  try {
    account = pickAccount(await getJson(fetchImpl, `${NETLIFY_API}/accounts`, init, 'Netlify accounts'), accountSlug);
  } catch (error) {
    result.failures.push(error.message);
    return result;
  }

  try {
    const status = await getJson(fetchImpl, `${NETLIFY_API}/${account.id}/builds/status`, init, 'Netlify build status');
    result.readings.push(buildMinutesReading(status));
  } catch (error) {
    result.failures.push(error.message);
  }

  try {
    const body = await getJson(fetchImpl, `${NETLIFY_API}/accounts/${account.slug}/bandwidth`, init, 'Netlify bandwidth');
    result.readings.push(bandwidthReading(body));
  } catch (error) {
    result.warnings.push(`${error.message} (undocumented endpoint)`);
  }

  return result;
}

/* Supabase ---------------------------------------------------------------- */

function supabaseRest({ fetchImpl, url, key }) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  return {
    databaseBytes: () =>
      getJson(fetchImpl, `${base}/rpc/usage_database_bytes`, { method: 'POST', headers, body: '{}' }, 'Supabase usage_database_bytes'),
    history: (metric, since) =>
      getJson(
        fetchImpl,
        `${base}/usage_snapshots?select=taken_on,used&metric=eq.${metric}&taken_on=gte.${since}&order=taken_on.asc`,
        { headers },
        'Supabase usage_snapshots read',
      ),
    upsert: (rows) =>
      getJson(
        fetchImpl,
        `${base}/usage_snapshots?on_conflict=metric,taken_on`,
        { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) },
        'Supabase usage_snapshots write',
      ),
    prune: (before) =>
      getJson(
        fetchImpl,
        `${base}/usage_snapshots?taken_on=lt.${before}`,
        { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } },
        'Supabase usage_snapshots prune',
      ),
  };
}

/* GitHub ------------------------------------------------------------------ */

function github({ fetchImpl, token, repo, assignee }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  return {
    // Open or closed, so closing the issue does not bring it back this
    // period. Search rather than a list: the list endpoint mixes in pull
    // requests, and a month of them can push an issue off the first page.
    // Search matches words, so the exact title is checked here.
    hasIssue: async (title) => {
      const q = `repo:${repo} is:issue in:title "${title.replace(/"/g, '')}"`;
      const found = await getJson(
        fetchImpl,
        `${GITHUB_API}/search/issues?q=${encodeURIComponent(q)}&per_page=20`,
        { headers },
        'GitHub issue search',
      );
      return (found?.items || []).some((i) => i.title === title);
    },
    // Assigned to the repo owner so GitHub emails them, whatever their
    // watch settings for issues.
    open: (title, body) =>
      getJson(
        fetchImpl,
        `${GITHUB_API}/repos/${repo}/issues`,
        { method: 'POST', headers, body: JSON.stringify({ title, body, ...(assignee ? { assignees: [assignee] } : {}) }) },
        'GitHub issue create',
      ),
  };
}

/* Run --------------------------------------------------------------------- */

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function daysAgo(now, days) {
  return isoDate(new Date(now).getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * One check. Everything external is passed in, so tests drive it with a fake
 * fetch.
 *
 * @returns {Promise<{rows: object[], opened: string[], failures: string[], warnings: string[]}>}
 */
async function runUsageCheck({ env, fetchImpl = fetch, now = new Date(), log = console.log }) {
  const failures = [];
  const warnings = [];
  const today = isoDate(now);

  const netlify = await readNetlify({
    fetchImpl,
    token: env.NETLIFY_USAGE_TOKEN,
    accountSlug: env.NETLIFY_ACCOUNT_SLUG,
  });
  failures.push(...netlify.failures);
  warnings.push(...netlify.warnings);
  const readings = [...netlify.readings];

  const db = supabaseRest({ fetchImpl, url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
  try {
    readings.push({ metric: 'supabase_database_size', used: Number(await db.databaseBytes()) });
  } catch (error) {
    failures.push(error.message);
  }

  const rows = [];
  for (const reading of readings) {
    // A gauge's history only feeds its projection. If it cannot be read, the
    // reading is still stored and checked against the limit, unprojected.
    let history = [];
    if (METRICS[reading.metric].kind === 'gauge') {
      try {
        history = ((await db.history(reading.metric, daysAgo(now, HISTORY_DAYS))) || []).map((h) => ({ ...h, used: Number(h.used) }));
      } catch (error) {
        failures.push(error.message);
      }
    }
    try {
      rows.push({ ...evaluate(reading, now, history), taken_on: today, checked_at: new Date(now).toISOString() });
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const row of rows) {
    const projected = row.projected == null ? 'no projection yet' : `projected ${formatAmount(row.projected, row.unit)}`;
    log(`${METRICS[row.metric].label}: ${formatAmount(row.used, row.unit)} of ${formatAmount(row.usage_limit, row.unit)}, ${projected}, ${row.level}`);
  }

  if (rows.length) {
    try {
      await db.upsert(rows);
      await db.prune(daysAgo(now, KEEP_DAYS));
    } catch (error) {
      failures.push(error.message);
    }
  }

  const opened = [];
  const problems = rows.filter((r) => r.level === 'problem');
  if (problems.length) {
    try {
      const gh = github({ fetchImpl, token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY, assignee: env.GITHUB_ASSIGNEE });
      for (const row of problems) {
        const title = issueTitle(row, now);
        if (await gh.hasIssue(title)) {
          log(`Issue already opened this period: ${title}`);
          continue;
        }
        await gh.open(title, issueBody(row));
        opened.push(title);
        log(`Opened issue: ${title}`);
      }
    } catch (error) {
      failures.push(error.message);
    }
  }

  warnings.forEach((w) => log(`Warning: ${w}`));
  return { rows, opened, failures, warnings };
}

async function main() {
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY']) {
    if (!process.env[name]) throw new Error(`${name} is not set`);
  }
  const { failures } = await runUsageCheck({ env: process.env });
  if (failures.length) {
    failures.forEach((f) => console.error(`Failed: ${f}`));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runUsageCheck, readNetlify, buildMinutesReading, bandwidthReading, pickAccount };
