import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // 10 minutes, the same as a player's event standings

// A week usually runs three (SotW, BotW, RotW). The cap keeps one cache miss
// well inside WOM's per-minute limit if a lot ever run at once.
const MAX_COMPETITIONS = 6;

export const TOP_PLACES = 3;

/**
 * The top of one competition's standings: the first three players with any
 * gain, highest first. Players on the same gain share a place (12, 12, 9 is
 * 1st, 1st, 3rd).
 *
 * @param {Array<{ player?: { displayName?: string, username?: string }, progress?: { gained?: number } }>} participations
 * @returns {Array<{ place: number, name: string, gained: number }>}
 */
export function topPlayers(participations) {
  const ranked = (Array.isArray(participations) ? participations : [])
    .map((p) => ({
      name: p?.player?.displayName || p?.player?.username || '',
      gained: Number(p?.progress?.gained) || 0,
    }))
    .filter((p) => p.name && p.gained > 0)
    .sort((a, b) => b.gained - a.gained)
    .slice(0, TOP_PLACES);

  return ranked.map((p) => ({
    place: ranked.findIndex((q) => q.gained === p.gained) + 1,
    ...p,
  }));
}

/**
 * The top three in each of the clan's WOM competitions running right now.
 *
 *   GET /api/wom-competition-leaders
 *
 * WOM's list of the group's competitions has no standings, only a head
 * count, so each running competition is fetched on its own. One cached
 * response covers them all, so a cache miss costs one list call plus one per
 * running competition, not one per visitor.
 *
 * Returns, soonest-ending first:
 *   [{ competitionId, top: [{ place, name, gained }] }]
 */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const groupId = Deno.env.get('WOM_GROUP_ID') || '2928';

  try {
    const listRes = await womFetch(`/groups/${groupId}/competitions`);
    if (!listRes.ok) return womError(listRes);
    const list = await listRes.json();

    const now = Date.now();
    const running = (Array.isArray(list) ? list : [])
      .filter((c) => {
        const start = new Date(c?.startsAt).getTime();
        const end = new Date(c?.endsAt).getTime();
        return Number.isInteger(c?.id) && start <= now && now < end;
      })
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))
      .slice(0, MAX_COMPETITIONS);

    const responses = await Promise.all(running.map((c) => womFetch(`/competitions/${c.id}`)));

    // Any failure fails the whole answer, uncached, rather than caching a
    // list with a competition missing for the next ten minutes.
    const failed = responses.find((res) => !res.ok);
    if (failed) {
      await Promise.all(responses.map((res) => res.body?.cancel().catch(() => {})));
      return womError(failed);
    }

    const details = await Promise.all(responses.map((res) => res.json()));
    const leaders = running.map((c, i) => ({
      competitionId: c.id,
      top: topPlayers(details[i]?.participations),
    }));

    return cachedJson(leaders, { ttl: TTL, tag: `wom-competition-leaders-${groupId}` });
  } catch (error) {
    console.error('wom-competition-leaders failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-competition-leaders',
  cache: 'manual',
};
