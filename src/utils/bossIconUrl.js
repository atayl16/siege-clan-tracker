/**
 * Public URL for a boss icon held in Supabase Storage.
 *
 * Boss icons are normally bundled assets imported by OsrsIcons.jsx, which means
 * a boss added to the game needs a deploy before it renders. Storage is the
 * escape hatch: drop `<metric_key>.png` into the bucket and the site picks it up
 * on the next page load, no build required.
 *
 * Bundled assets still win when present - they are cached with the bundle and
 * cost no extra request.
 */

export const BOSS_ICON_BUCKET = 'boss-icons';

/**
 * @param {string} metric - WOM metric key, e.g. "doom_of_mokhaiotl"
 * @returns {string|null} public URL, or null when it cannot be built
 */
export function bossIconUrl(metric) {
  // Read at call time rather than module load: vite.config.js injects
  // process.env.* via define at build time, but vitest.config.js does not, so
  // tests need to be able to set this before calling.
  const baseUrl = process.env.SUPABASE_URL;
  if (!baseUrl || !metric) return null;

  // Metric keys come from WOM and are always lowercase snake_case, but this is
  // interpolated into a URL, so reject anything that is not.
  if (!/^[a-z0-9_]+$/.test(metric)) return null;

  return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BOSS_ICON_BUCKET}/${metric}.png`;
}
