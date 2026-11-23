import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { jsonError, cachedJson } from './_shared/wom.js';
import { rpFetch, slimActivity } from './_shared/runeprofile.js';

const TTL = 600; // seconds
const LIMIT = 20;
// OSRS names: up to 12 letters, digits, spaces, hyphens and underscores.
const USERNAME = /^[A-Za-z0-9 _-]{1,12}$/;

/**
 * One character's latest RuneProfile activity, for the profile's
 * Achievements tab (fetched only when its Recent section is opened).
 *
 * A character without RuneProfile is a normal answer, not an error:
 * { found: false }, cached like any other, so it is not asked again on
 * every visit.
 *
 *   GET /api/runeprofile-activity?username=<rsn>
 */
export default async (request) => {
  // Keeps other sites from using this as a free relay. Not authentication:
  // the data is public RuneProfile data (see _shared/wom.js on caching).
  const { authorized, reason } = checkAuth(request);
  if (!authorized) return unauthorizedResponse(reason);
  // Not trimmed: the edge cache keys on the raw query value, so "Test Main "
  // would be a second cache entry (and a second RuneProfile call) for the
  // same account. The site always sends the stored name as it is.
  const username = new URL(request.url).searchParams.get('username') || '';
  if (!USERNAME.test(username) || username !== username.trim()) {
    return jsonError(400, 'Missing or invalid username');
  }

  try {
    const res = await rpFetch(`/accounts/${encodeURIComponent(username)}/activities?limit=${LIMIT}`);
    if (res.status === 404 || res.status === 400) {
      await res.body?.cancel().catch(() => {});
      return cachedJson({ found: false, activities: [] }, { ttl: TTL, tag: 'runeprofile-account', varyQuery: 'username' });
    }
    if (!res.ok) return jsonError(res.status >= 500 ? 502 : res.status, `RuneProfile API Error: ${res.status}`);
    const body = await res.json();
    return cachedJson(
      { found: true, activities: (body.activities || []).map(slimActivity) },
      { ttl: TTL, tag: 'runeprofile-account', varyQuery: 'username' }
    );
  } catch (error) {
    console.error('runeprofile-activity failed:', error);
    return jsonError(502, `Failed to reach RuneProfile: ${error.message}`);
  }
};

export const config = {
  path: '/api/runeprofile-activity',
  cache: 'manual',
};
