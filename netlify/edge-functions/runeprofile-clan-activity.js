import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { jsonError, cachedJson } from './_shared/wom.js';
import { rpFetch, slimActivity } from './_shared/runeprofile.js';

const TTL = 600; // seconds
const CLAN = 'Siege';

/**
 * feed: the home page's "Latest from the clan", every kind, newest 20.
 * page: the Achievements page's Clan activity tab, newest 50 (the API's
 *       maximum), leaving out level-ups and XP milestones, which that page's
 *       Wise Old Man milestones already list.
 */
const VIEWS = {
  feed: { limit: 20, types: null },
  page: {
    limit: 50,
    types: [
      'new_item_obtained',
      'valuable_drop',
      'quest_completed',
      'achievement_diary_tier_completed',
      'combat_achievement_task_completed',
      'combat_achievement_tier_completed',
      'combat_achievement_tier_reached',
      'maxed',
    ],
  },
};

/**
 * The clan's latest RuneProfile activity (new collection log items, drops,
 * quests, diaries, combat achievements, level-ups). One RuneProfile call per
 * view per TTL for every visitor, cached at the edge.
 *
 *   GET /api/runeprofile-clan-activity[?view=feed|page]
 */
export default async (request) => {
  // Keeps other sites from using this as a free relay. Not authentication:
  // the data is public RuneProfile data (see _shared/wom.js on caching).
  const { authorized, reason } = checkAuth(request);
  if (!authorized) return unauthorizedResponse(reason);
  try {
    const viewName = new URL(request.url).searchParams.get('view') || 'feed';
    const view = VIEWS[viewName];
    if (!view) return jsonError(400, 'Unknown view');
    const types = view.types ? `&activityTypes=${view.types.join(',')}` : '';
    const res = await rpFetch(`/clans/${encodeURIComponent(CLAN)}/activities?limit=${view.limit}${types}`);
    if (!res.ok) return jsonError(res.status >= 500 ? 502 : res.status, `RuneProfile API Error: ${res.status}`);
    const body = await res.json();
    return cachedJson(
      { activities: (body.activities || []).map(slimActivity) },
      { ttl: TTL, tag: 'runeprofile-clan', varyQuery: 'view' }
    );
  } catch (error) {
    console.error('runeprofile-clan-activity failed:', error);
    return jsonError(502, `Failed to reach RuneProfile: ${error.message}`);
  }
};

export const config = {
  path: '/api/runeprofile-clan-activity',
  cache: 'manual',
};
