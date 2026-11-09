/**
 * Shared plumbing for the /api/wom-* edge functions.
 *
 * Two things here exist because of the WOM rate limit (20 requests a minute
 * per IP without a key, 100 per key with one):
 *
 * 1. The key goes in `x-api-key`. That is the only header WOM reads; the
 *    `Authorization: Bearer` some of these functions used to send was
 *    ignored, so those calls counted as anonymous, against an IP shared with
 *    every other site on the same Netlify edge node.
 *
 * 2. Responses are cached at the edge. Netlify only caches an edge function's
 *    response when the function opts in with `cache: "manual"` in its config
 *    (written out literally in each config so the build can read it
 *    statically); without it the Cache-Control headers these
 *    functions always set were ignored and every page view called WOM.
 *
 * A cached response is served without running the function, so checkAuth()
 * is skipped on a hit. That is acceptable only because everything here is
 * public WOM data that anyone can fetch from api.wiseoldman.net directly.
 * Do not cache anything from Supabase this way.
 */

const WOM_API = 'https://api.wiseoldman.net/v2';
const BASE_HEADERS = { 'User-Agent': 'Siege-Clan-Tracker/1.0' };

/**
 * GET a WOM API path, e.g. womFetch('/groups/2928/statistics').
 *
 * Sends WOM_API_KEY when it is set. WOM answers 403 for a key it does not
 * recognise; rather than take the whole page down for a bad env var, that
 * retries once without the key (anonymous limits) and logs loudly.
 */
export async function womFetch(path) {
  const url = `${WOM_API}${path}`;
  const key = Deno.env.get('WOM_API_KEY');

  if (key) {
    const res = await fetch(url, { headers: { ...BASE_HEADERS, 'x-api-key': key } });
    if (res.status !== 403) return res;
    console.error('WOM rejected WOM_API_KEY with 403; retrying without it. Check the key in the Netlify environment.');
    // Release the unread 403 body before the retry. Failing to cancel it
    // must not stop the retry.
    await res.body?.cancel().catch(() => {});
  }

  return fetch(url, { headers: BASE_HEADERS });
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * A JSON error response for a failed WOM call. Never cached (no cache
 * headers), so one bad minute upstream does not stick.
 *
 * 429 passes through with WOM's Retry-After, so the client sees "slow down"
 * rather than a server error. Other 4xx pass through (a 404 player is a real
 * answer); 5xx becomes 502, since the failure is upstream, not here.
 */
export function womError(res) {
  if (res.status === 429) {
    const headers = { ...jsonHeaders };
    const retryAfter = res.headers.get('Retry-After');
    if (retryAfter) headers['Retry-After'] = retryAfter;
    return new Response(
      JSON.stringify({ error: 'WiseOldMan is rate limiting requests. Try again in a minute.' }),
      { status: 429, headers }
    );
  }
  return jsonError(res.status >= 500 ? 502 : res.status, `WOM API Error: ${res.status}`);
}

export function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
}

/**
 * A cacheable JSON success response.
 *
 * - Cache-Control: what the browser may keep.
 * - Netlify-CDN-Cache-Control: what the edge keeps. stale-while-revalidate
 *   lets the edge answer instantly from the old copy for one more TTL while
 *   it refreshes in the background, so an expiry costs one WOM call, not one
 *   per visitor who arrives in the meantime.
 * - Netlify-Vary: for per-player endpoints, so ?id=1 and ?id=2 are cached
 *   separately. Stated explicitly rather than relying on the default cache
 *   key, because getting it wrong would show one player another's data.
 * - Netlify-Cache-Tag: lets a deploy or an API call purge just this entry.
 *
 * @param {unknown} data
 * @param {{ ttl: number, tag: string, varyQuery?: string }} options
 */
export function cachedJson(data, { ttl, tag, varyQuery }) {
  const headers = {
    ...jsonHeaders,
    'Cache-Control': `public, max-age=${ttl}`,
    'Netlify-CDN-Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${ttl}`,
    'Netlify-Cache-Tag': tag,
  };
  if (varyQuery) headers['Netlify-Vary'] = `query=${varyQuery}`;
  return new Response(JSON.stringify(data), { headers });
}
