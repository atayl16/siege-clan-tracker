import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // seconds

/**
 * One player's WOM profile, cached at the edge per id (see _shared/wom.js).
 *
 *   GET /api/wom-player?id=<members.wom_id>
 */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const playerId = new URL(request.url).searchParams.get('id');

  // Callers pass the numeric WOM id (members.wom_id). It must be digits
  // only: it goes into the upstream path, so anything else could reach a
  // different WOM endpoint through this proxy.
  if (!playerId || !/^\d+$/.test(playerId)) {
    return jsonError(400, 'Missing or invalid player ID');
  }

  try {
    // /players/id/:id looks a player up by numeric id. /players/:x looks up
    // by *username*, so a numeric id there 404s.
    const res = await womFetch(`/players/id/${playerId}`);
    if (!res.ok) return womError(res);
    return cachedJson(await res.json(), { ttl: TTL, tag: `wom-player-${playerId}`, varyQuery: 'id' });
  } catch (error) {
    console.error('wom-player failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-player',
  cache: 'manual',
};
