/**
 * Start a GitHub Actions workflow through the REST API (workflow_dispatch).
 *
 * Why this exists: GitHub runs scheduled workflows when it gets to them, and
 * for this repo that has meant the "hourly" sync starting only every 6-8
 * hours and the daily sync up to 7 hours late, whatever minute the cron uses.
 * Netlify's scheduled functions fire on time, so they start the workflows
 * instead; the work itself still runs on GitHub Actions (free for a public
 * repo), and GitHub's own cron stays in each workflow as a backup.
 *
 * Needs GITHUB_DISPATCH_TOKEN in Netlify: a fine-grained personal access
 * token limited to this repository, with "Actions: Read and write". See
 * docs/setup/scheduled-sync.md.
 *
 * Kept free of request handling so it can be tested with a stand-in fetch.
 */

const DEFAULT_REPO = 'atayl16/siege-clan-tracker';

/**
 * @param {object} args
 * @param {string} args.workflow - the workflow file name, e.g. "hourly-clan-sync.yml"
 * @param {string} [args.token] - defaults to process.env.GITHUB_DISPATCH_TOKEN
 * @param {string} [args.repo] - "owner/name"; defaults to GITHUB_DISPATCH_REPO or this repo
 * @param {string} [args.ref] - branch to run on
 * @param {Function} [args.fetchImpl]
 * @param {number} [args.timeoutMs] - scheduled functions get 30 seconds in all
 * @returns {Promise<{ started: boolean, reason?: string }>}
 *   started: false only when no token is set, so a missing setup is a log
 *   line rather than a failed function every hour.
 * @throws when GitHub refuses the request or does not answer in time
 */
async function dispatchWorkflow({
  workflow,
  token = process.env.GITHUB_DISPATCH_TOKEN,
  repo = process.env.GITHUB_DISPATCH_REPO || DEFAULT_REPO,
  ref = 'main',
  fetchImpl = fetch,
  timeoutMs = 10000,
}) {
  if (!token) {
    return { started: false, reason: 'GITHUB_DISPATCH_TOKEN is not set' };
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'siege-clan-tracker-scheduler',
      },
      body: JSON.stringify({ ref }),
      signal: controller.signal,
    });
    // GitHub answers 204 No Content when the run is queued.
    if (res.status !== 204) {
      const detail = await res.text().catch(() => '');
      throw new Error(`GitHub refused to start ${workflow}: ${res.status} ${detail}`.trim());
    }
    return { started: true };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`GitHub did not answer within ${timeoutMs}ms when starting ${workflow}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A Netlify scheduled-function handler that starts one workflow. Logs the
 * outcome; a refusal is rethrown so it shows as a failed invocation in
 * Netlify's function log.
 */
function scheduledDispatch(workflow) {
  return async () => {
    const result = await dispatchWorkflow({ workflow });
    if (result.started) {
      console.log(`Started ${workflow}`);
    } else {
      console.warn(`Did not start ${workflow}: ${result.reason}`);
    }
    return { statusCode: 200, body: JSON.stringify({ workflow, ...result }) };
  };
}

module.exports = { dispatchWorkflow, scheduledDispatch, DEFAULT_REPO };
