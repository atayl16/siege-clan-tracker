/**
 * Content-based ETags for the cached API endpoints.
 *
 * Every endpoint used to build its tag from the date:
 *
 *   const etag = `W/"members-${new Date().toISOString().split('T')[0]}"`;
 *
 * which only changes once a day. A browser holding a copy would revalidate,
 * get 304 Not Modified, and keep showing stale data for the rest of the day -
 * so a member added at 10am was invisible until tomorrow, even though the sync
 * runs hourly. It showed up as the admin user list missing two accounts that
 * were definitely in the database, and a hard refresh being the only fix.
 *
 * Hashing the payload instead means the tag changes exactly when the data does:
 * unchanged data still gets a cheap 304, changed data is delivered.
 *
 * Deliberately djb2 rather than crypto.subtle: it is synchronous, has no API
 * surface to get wrong in Deno, and this is a cache key rather than a security
 * boundary. Collisions would serve stale data, and at 32 bits over a payload
 * that changes a few times a day that is not a real risk.
 */
function djb2(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * @param {string} name - endpoint name, to keep tags distinct across routes
 * @param {unknown} data - the payload about to be returned
 * @returns {string} a weak ETag derived from the content
 */
export function contentEtag(name, data) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return `W/"${name}-${djb2(body)}"`;
}

/**
 * Cache headers for a data endpoint.
 *
 * Short max-age plus must-revalidate: the browser rechecks quickly, and the
 * content ETag turns an unchanged recheck into a 304. The old headers used
 * max-age up to 3000 seconds, so a stale copy was not even rechecked for the
 * best part of an hour.
 */
export function cacheHeaders(etag, maxAge = 60) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
    "CDN-Cache-Control": `public, max-age=${maxAge}, must-revalidate`,
    ETag: etag,
  };
}

/**
 * Whether an If-None-Match header covers this tag.
 *
 * The header can list several tags, or be "*". Comparison is weak (RFC 9110
 * 13.1.2), so W/"x" and "x" match - a CDN that strips or adds the W/ prefix
 * would otherwise turn every revalidation into a full download.
 */
export function etagMatches(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  const strip = (tag) => tag.trim().replace(/^W\//, "");
  const target = strip(etag);
  return ifNoneMatch.split(",").some((tag) => strip(tag) === target);
}

/**
 * Respond with `data`, or 304 if the client already holds this exact payload.
 *
 * The tag can only be computed from the data, so the query always runs; what
 * a 304 saves is the response body, not the database round trip. That is the
 * price of correctness - the old date tag skipped the query and served
 * yesterday's answer.
 *
 * @param {Request} request
 * @param {string} name - endpoint name, see contentEtag
 * @param {unknown} data - the payload
 * @param {object} [options]
 * @param {number} [options.maxAge] - seconds, see cacheHeaders
 * @param {string} [options.cacheTag] - Netlify-Cache-Tag, for purging
 */
export function jsonWithEtag(request, name, data, { maxAge, cacheTag } = {}) {
  const body = JSON.stringify(data);
  const etag = contentEtag(name, body);
  const headers = cacheHeaders(etag, maxAge);
  if (cacheTag) headers["Netlify-Cache-Tag"] = cacheTag;

  if (etagMatches(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}
