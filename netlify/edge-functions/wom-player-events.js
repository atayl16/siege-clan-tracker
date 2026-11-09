import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // 10 minutes, the same as wom-player

/**
 * A player's placement in every WOM competition they are in right now.
 *
 *   GET /api/wom-player-events?id=<members.wom_id>
 *
 * WOM keys standings by username, but the app knows players by their numeric
 * WOM id. Usernames change (name changes), ids do not, so this resolves the
 * current username from the id first rather than trusting members.name.
 *
 * Returns a trimmed list, one entry per ongoing competition:
 *   { competitionId, title, metric, type, endsAt, rank, participantCount, gained }
 */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const playerId = new URL(request.url).searchParams.get('id');

  // Digits only: it goes into the upstream path.
  if (!playerId || !/^\d+$/.test(playerId)) {
    return jsonError(400, 'Missing or invalid player ID');
  }

  try {
    const playerRes = await womFetch(`/players/id/${playerId}`);
    if (!playerRes.ok) return womError(playerRes);
    const player = await playerRes.json();
    if (!player?.username) {
      return jsonError(502, 'WOM returned no username for this player');
    }

    const standingsRes = await womFetch(
      `/players/${encodeURIComponent(player.username)}/competitions/standings?status=ongoing`
    );
    if (!standingsRes.ok) return womError(standingsRes);
    const standings = await standingsRes.json();

    const events = (Array.isArray(standings) ? standings : [])
      .filter((s) => s?.competition)
      .map((s) => ({
        competitionId: s.competition.id,
        title: s.competition.title,
        metric: s.competition.metric,
        type: s.competition.type,
        endsAt: s.competition.endsAt,
        rank: s.rank ?? null,
        participantCount: s.competition.participantCount ?? null,
        gained: s.progress?.gained ?? 0,
      }))
      // Soonest-ending first: those are the placements about to be final.
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));

    return cachedJson(events, { ttl: TTL, tag: `wom-player-events-${playerId}`, varyQuery: 'id' });
  } catch (error) {
    console.error('wom-player-events failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-player-events',
  cache: 'manual',
};
