import { checkAuth, unauthorizedResponse } from './_shared/auth.js';

const WOM_API = 'https://api.wiseoldman.net/v2';
const TTL = 600; // 10 minutes, the same as wom-player

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

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
    return json({ error: 'Missing or invalid player ID' }, 400);
  }

  const womHeaders = { headers: { 'User-Agent': 'Siege-Clan-Tracker/1.0' } };

  try {
    const playerRes = await fetch(`${WOM_API}/players/id/${playerId}`, womHeaders);
    if (!playerRes.ok) {
      return json({ error: `WOM API Error: ${playerRes.status}` }, playerRes.status);
    }
    const player = await playerRes.json();
    if (!player?.username) {
      return json({ error: 'WOM returned no username for this player' }, 502);
    }

    const standingsRes = await fetch(
      `${WOM_API}/players/${encodeURIComponent(player.username)}/competitions/standings?status=ongoing`,
      womHeaders
    );
    if (!standingsRes.ok) {
      return json({ error: `WOM API Error: ${standingsRes.status}` }, standingsRes.status);
    }
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

    return json(events, 200, {
      'Cache-Control': `public, max-age=${TTL}`,
      'CDN-Cache-Control': `public, max-age=${TTL}`,
      'Netlify-Cache-Tag': `wom-player-events-${playerId}`,
    });
  } catch (error) {
    return json({ error: `Failed to fetch player events: ${error.message}` }, 500);
  }
};

export const config = {
  path: '/api/wom-player-events',
};
