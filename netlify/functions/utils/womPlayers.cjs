/**
 * Player stats from WiseOldMan, for Netlify functions and the sync scripts.
 *
 * WOM keeps a saved snapshot of each player and only refreshes it when asked
 * (someone pressing Update on wiseoldman.net, the RuneLite plugin on logout,
 * or our group update-all for players untouched in 24 hours). Reading the
 * snapshot can therefore be hours or days behind the hiscores. Anything that
 * records a starting point or shows live progress should `force`, which asks
 * WOM to pull the current hiscores first.
 */

const WOM_API_BASE = 'https://api.wiseoldman.net/v2';

/** One WOM request with a timeout; null on any failure. */
async function womRequest(fetchImpl, url, { method = 'GET', apiKey, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { 'User-Agent': 'Siege-Clan-Tracker/1.0' };
    if (apiKey) headers['x-api-key'] = apiKey;
    const res = await fetchImpl(url, { method, headers, signal: controller.signal });
    if (!res.ok) {
      // Drain it so the connection is released.
      await res.body?.cancel?.().catch(() => {});
      return null;
    }
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One player's latest snapshot data.
 *
 * With `force`, WOM is first asked to pull the player's current hiscores
 * (POST /players/:username). WOM refuses that more than about once a minute
 * per player, and it fails when the hiscores are down; the saved snapshot is
 * used then, and `updated` says which one you got.
 *
 * @returns {Promise<{ data: object|null, updated: boolean }>}
 */
async function fetchPlayer(
  womId,
  { force = false, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}
) {
  const player = await womRequest(fetchImpl, `${WOM_API_BASE}/players/id/${womId}`, { apiKey, timeoutMs });
  const saved = player?.latestSnapshot?.data ?? null;
  if (!force || !player?.username) return { data: saved, updated: false };

  const fresh = await womRequest(
    fetchImpl,
    `${WOM_API_BASE}/players/${encodeURIComponent(player.username)}`,
    { method: 'POST', apiKey, timeoutMs }
  );
  const data = fresh?.latestSnapshot?.data;
  return data ? { data, updated: true } : { data: saved, updated: false };
}

/**
 * Latest snapshot data for several players, a few at a time.
 *
 * @param {number[]} womIds
 * @returns {Promise<Map<number, object>>} wom_id -> latestSnapshot.data
 */
async function fetchSnapshots(
  womIds,
  { force = false, apiKey, fetchImpl = globalThis.fetch, concurrency = 4, delayMs = 0, timeoutMs = 4000, log = () => {} } = {}
) {
  const snapshots = new Map();
  const queue = [...new Set(womIds.map(Number))];

  async function worker() {
    while (queue.length) {
      const womId = queue.shift();
      const { data } = await fetchPlayer(womId, { force, apiKey, fetchImpl, timeoutMs });
      if (data) snapshots.set(womId, data);
      else log(`No WOM data for player ${womId}; skipping them this time`);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return snapshots;
}

module.exports = { WOM_API_BASE, fetchPlayer, fetchSnapshots };
