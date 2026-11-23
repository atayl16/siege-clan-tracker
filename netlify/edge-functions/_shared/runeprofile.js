/**
 * Shared plumbing for the /api/runeprofile-* edge functions.
 *
 * RuneProfile (runeprofile.com) has an official, read-only public API:
 * 30 requests a minute per caller without a key, responses cached for a
 * minute on its side. It asks callers to send a User-Agent naming the app so
 * it can get in touch about problems; browsers cannot set User-Agent, which
 * is one reason this goes through our edge rather than the browser calling
 * RuneProfile directly. The other is cost: responses are cached here (see
 * cachedJson in ./wom.js), so a busy page makes one RuneProfile call per
 * cache period, not one per visitor.
 *
 * Only players who use the RuneProfile RuneLite plugin have data.
 */

const RUNEPROFILE_API = 'https://www.runeprofile.com/api/v1';
const HEADERS = { 'User-Agent': 'siege-clan.com (OSRS clan site; https://www.siege-clan.com)' };

/** GET a RuneProfile public API path, e.g. rpFetch('/clans/Siege/activities?limit=20'). */
export function rpFetch(path) {
  return fetch(`${RUNEPROFILE_API}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
}

/**
 * The fields the site shows from an activity, so the cached response is
 * small and nothing else RuneProfile adds later leaks through.
 */
export function slimActivity(a) {
  return {
    type: a.type,
    data: a.data ?? {},
    enriched: a.enriched ?? null,
    createdAt: a.createdAt,
    username: a.account?.username ?? null,
  };
}
