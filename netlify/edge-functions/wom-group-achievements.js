import { checkAuth, unauthorizedResponse } from './_shared/auth.js';
import { womFetch, womError, jsonError, cachedJson } from './_shared/wom.js';

const TTL = 600; // seconds

/** Recent achievements for the clan's WOM group, cached at the edge (see _shared/wom.js). */
export default async (request, _context) => {
  const { authorized, reason } = checkAuth(request);
  if (!authorized) {
    return unauthorizedResponse(reason);
  }

  const groupId = Deno.env.get('WOM_GROUP_ID') || '2928';

  try {
    const res = await womFetch(`/groups/${groupId}/achievements`);
    if (!res.ok) return womError(res);
    return cachedJson(await res.json(), { ttl: TTL, tag: `group-achievements-${groupId}` });
  } catch (error) {
    console.error('wom-group-achievements failed:', error);
    return jsonError(502, `Failed to reach WiseOldMan: ${error.message}`);
  }
};

export const config = {
  path: '/api/wom-group-achievements',
  cache: 'manual',
};
