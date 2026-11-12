/**
 * The WiseOldMan calls the poll jobs make. Reads need no key; the key only
 * raises the rate limit.
 */

const WOM_API_BASE = 'https://api.wiseoldman.net/v2';
const DEFAULT_GROUP_ID = '2928';

// WOM sits behind Cloudflare, which challenges the default curl/node agent.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function groupId() {
  return process.env.WOM_GROUP_ID || DEFAULT_GROUP_ID;
}

async function womGet(path) {
  const headers = { 'User-Agent': USER_AGENT };
  if (process.env.WOM_API_KEY) headers['x-api-key'] = process.env.WOM_API_KEY;

  const url = `${WOM_API_BASE}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`WOM returned ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Every competition the group has ever had. As of Nov 2026 the endpoint
 * returns the full list in one response (229 items) and ignores limit/offset.
 */
async function fetchGroupCompetitions() {
  const competitions = await womGet(`/groups/${groupId()}/competitions`);
  if (!Array.isArray(competitions)) {
    throw new Error('WOM group competitions response was not a list');
  }
  return competitions;
}

/**
 * Overall XP each group member gained between two instants, highest first.
 * Used by the weekly XP award (scripts/sync-tasks/weekly-xp-awards.cjs).
 * WOM counts snapshots inside the window, so a gain made before endDate but
 * only recorded after it falls into the next window, as in a competition.
 */
async function fetchGroupGained(startDate, endDate) {
  const query = new URLSearchParams({
    metric: 'overall',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: '50',
  });
  const rows = await womGet(`/groups/${groupId()}/gained?${query}`);
  if (!Array.isArray(rows)) throw new Error('WOM group gained response was not a list');
  return rows;
}

/** Every boss metric WOM currently tracks. */
async function fetchBossMetrics() {
  const stats = await womGet(`/groups/${groupId()}/statistics`);
  const bosses = stats?.metricLeaders?.bosses;
  if (!bosses || typeof bosses !== 'object') {
    throw new Error('WOM group statistics response had no metricLeaders.bosses');
  }
  return Object.keys(bosses);
}

/**
 * Create one group competition. Every group member is enrolled automatically.
 *
 * @param {{title: string, metric: string, startsAt: string, endsAt: string}} payload
 * @returns {Promise<{id: number, title: string, metric: string}>}
 */
async function createGroupCompetition(payload) {
  const code = process.env.WOM_VERIFICATION_CODE;
  if (!code) throw new Error('WOM_VERIFICATION_CODE is not set');

  const headers = { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' };
  if (process.env.WOM_API_KEY) headers['x-api-key'] = process.env.WOM_API_KEY;

  const res = await fetch(`${WOM_API_BASE}/competitions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, groupId: Number(groupId()), groupVerificationCode: code }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WOM refused to create "${payload.title}" (${res.status}): ${text.slice(0, 300)}`);
  }
  const { competition } = JSON.parse(text);
  if (!competition?.id) throw new Error(`WOM created "${payload.title}" but returned no id`);
  return { id: competition.id, title: competition.title, metric: competition.metric };
}

const competitionUrl = (id) => `https://wiseoldman.net/competitions/${id}`;

module.exports = {
  fetchGroupCompetitions,
  fetchBossMetrics,
  fetchGroupGained,
  createGroupCompetition,
  competitionUrl,
};
