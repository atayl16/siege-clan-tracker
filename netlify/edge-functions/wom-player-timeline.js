import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // 10 minutes, the same as wom-player
const PERIODS = new Set(['week', 'month', 'year']);
// Enough for a small chart. A year is ~450 snapshots for an active player.
const MAX_POINTS = 120;

/**
 * Keep at most `max` points, evenly spread, always keeping the first and the
 * last, so the line starts and ends on real values.
 */
function downsample(points, max = MAX_POINTS) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * A player's total (Overall) XP over time, for the Profile chart.
 *
 *   GET /api/wom-player-timeline?id=<members.wom_id>&period=week|month|year
 *
 * WOM serves the timeline by username, so the current username is resolved
 * from the id first (names change, ids do not), as wom-player-events does.
 *
 * Returns { period, points: [{ date, value }] }, oldest first.
 */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const params = new URL(request.url).searchParams;
  const playerId = params.get('id');
  const period = params.get('period') || 'month';

  // Digits only: it goes into the upstream path.
  if (!playerId || !/^\d+$/.test(playerId)) {
    return jsonError(400, 'Missing or invalid player ID');
  }
  if (!PERIODS.has(period)) {
    return jsonError(400, 'period must be week, month or year');
  }

  try {
    const playerRes = await womFetch(`/players/id/${playerId}`);
    if (!playerRes.ok) return womError(playerRes);
    const player = await playerRes.json();
    if (!player?.username) {
      return jsonError(502, 'WOM returned no username for this player');
    }

    const query = new URLSearchParams({ metric: 'overall', period });
    const timelineRes = await womFetch(
      `/players/${encodeURIComponent(player.username)}/snapshots/timeline?${query}`
    );
    if (!timelineRes.ok) return womError(timelineRes);
    const timeline = await timelineRes.json();

    const points = (Array.isArray(timeline) ? timeline : [])
      // WOM reports -1 for an unranked skill; it is not a real XP value.
      .filter((p) => p && p.value > 0 && p.date)
      .map((p) => ({ date: p.date, value: p.value }))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    return cachedJson(
      { period, points: downsample(points) },
      { ttl: TTL, tag: `wom-player-timeline-${playerId}`, varyQuery: 'id|period' }
    );
  } catch (error) {
    console.error('wom-player-timeline failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-player-timeline',
  cache: 'manual',
};
