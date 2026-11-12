import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // seconds
const MAX_SPAN_MS = 31 * 24 * 60 * 60 * 1000;

// Exactly what Date.prototype.toISOString() produces. The values go into the
// upstream query, so nothing looser is accepted.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * Overall XP the clan's WOM group gained in a window, highest first, cached
 * at the edge per window (see _shared/wom.js).
 *
 *   GET /api/wom-group-gained?startDate=<ISO>&endDate=<ISO>
 *
 * The page asks for the current XP week (src/utils/xpWeek.js). endDate is the
 * week's end, in the future while the week runs, which WOM accepts; that keeps
 * the URL the same all week, so every visitor shares one cached copy.
 *
 * Every member with a gain is kept, since the Profile page shows the
 * viewer's own place however far down they are, but only the fields the page
 * uses: WOM's answer carries each member's whole player record.
 *
 * WOM caps limit at 50 but, as of Nov 2026, ignores it when dates are given
 * and returns the whole group (130 members, about 50 with a gain in a week).
 */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const params = new URL(request.url).searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  if (!ISO_INSTANT.test(startDate || '') || !ISO_INSTANT.test(endDate || '')) {
    return jsonError(400, 'startDate and endDate must be ISO timestamps');
  }
  const span = Date.parse(endDate) - Date.parse(startDate);
  if (!(span > 0) || span > MAX_SPAN_MS) {
    return jsonError(400, 'endDate must be after startDate and at most 31 days later');
  }

  const groupId = Deno.env.get('WOM_GROUP_ID') || '2928';

  try {
    const query = new URLSearchParams({ metric: 'overall', startDate, endDate, limit: '50' });
    const res = await womFetch(`/groups/${groupId}/gained?${query}`);
    if (!res.ok) return womError(res);

    const rows = await res.json();
    const trimmed = (Array.isArray(rows) ? rows : [])
      .filter((row) => (row?.data?.gained ?? 0) > 0)
      .sort((a, b) => b.data.gained - a.data.gained)
      .map((row) => ({
        player: {
          id: row.player.id,
          username: row.player.username,
          displayName: row.player.displayName,
        },
        data: { gained: row.data.gained },
      }));

    return cachedJson(trimmed, {
      ttl: TTL,
      tag: `group-gained-${groupId}`,
      varyQuery: 'startDate|endDate',
    });
  } catch (error) {
    console.error('wom-group-gained failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-group-gained',
  cache: 'manual',
};
