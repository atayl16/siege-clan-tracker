/**
 * Fails when WiseOldMan reports a boss the site cannot render.
 *
 * The Hall of Fame derives its rows from whatever WOM returns, but icons are
 * registered by hand in two places. BossIcon returns null for an unregistered
 * metric, so a boss added to the game shows up as a silently blank cell - no
 * error, no console warning. This turns that into a failed workflow run.
 *
 * Detection only. Adding a boss still needs a human, because the wiki image
 * filename frequently differs from the metric key (kril_tsutsaroth ->
 * K'ril_Tsutsaroth.png, barrows_chests -> Barrows.png, doom_of_mokhaiotl ->
 * Doom.png) and the icon has to be scaled to fit inside 640x480 or the fixed
 * 50x50 CSS squashes it.
 *
 *   node scripts/check-boss-coverage.cjs
 *
 * Exit 0 = every WOM boss is registered. Exit 1 = something is missing, or the
 * source files could not be parsed.
 */

const fs = require('fs');
const path = require('path');

const WOM_GROUP_ID = process.env.WOM_GROUP_ID || '2928';
const ROOT = path.join(__dirname, '..');

// WOM rejects the default curl/node user agent.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWomBosses() {
  const url = `https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}/statistics`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`WOM returned ${res.status} for ${url}`);
  }
  const body = await res.json();
  const bosses = body?.metricLeaders?.bosses;
  if (!bosses || typeof bosses !== 'object') {
    throw new Error('WOM response had no metricLeaders.bosses object');
  }
  return new Set(Object.keys(bosses));
}

/**
 * Pull registered metric keys out of a source file.
 *
 * Regex over JSX is brittle, so an empty result is treated as a parse failure
 * rather than "nothing registered" - otherwise a refactor here would report
 * every boss as missing and look like a real outage.
 */
function parseRegistered(file, blockPattern, keyPattern, label) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const block = src.match(blockPattern);
  if (!block) {
    throw new Error(`Could not find the ${label} block in ${file}. If it was renamed or reformatted, update this script.`);
  }
  const keys = [...block[1].matchAll(keyPattern)].map((m) => m[1]);
  if (keys.length === 0) {
    throw new Error(`Parsed the ${label} block in ${file} but found no entries. The format probably changed.`);
  }
  return new Set(keys);
}

async function main() {
  const wom = await fetchWomBosses();

  const metrics = parseRegistered(
    'src/components/MetricIcon.jsx',
    /const bossMetrics = \[([\s\S]*?)\]/,
    /"([a-z0-9_]+)"/g,
    'bossMetrics'
  );
  const icons = parseRegistered(
    'src/components/OsrsIcons.jsx',
    /const bossIcons = \{([\s\S]*?)\n {2}\};/,
    /^\s*([a-z0-9_]+):/gm,
    'bossIcons'
  );

  const missingMetrics = [...wom].filter((b) => !metrics.has(b)).sort();
  const missingIcons = [...wom].filter((b) => !icons.has(b)).sort();
  const stale = [...metrics].filter((b) => !wom.has(b)).sort();

  console.log(`WOM bosses: ${wom.size} | bossMetrics: ${metrics.size} | bossIcons: ${icons.size}`);

  if (stale.length) {
    // Not a failure: WOM drops a metric from metricLeaders when no clan member
    // has a ranked kill count, so this is usually noise rather than a problem.
    console.log(`\nRegistered but not currently reported by WOM (informational): ${stale.join(', ')}`);
  }

  if (!missingMetrics.length && !missingIcons.length) {
    console.log('\nEvery boss WOM reports is registered. Nothing to do.');
    return;
  }

  console.error('\nUnregistered bosses found. These render as blank cells in the Hall of Fame.');
  if (missingMetrics.length) {
    console.error(`  missing from src/components/MetricIcon.jsx bossMetrics: ${missingMetrics.join(', ')}`);
  }
  if (missingIcons.length) {
    console.error(`  missing from src/components/OsrsIcons.jsx bossIcons:    ${missingIcons.join(', ')}`);
  }
  console.error(
    '\nTo add one:\n' +
      '  1. Save the wiki image to src/assets/images/bosses/<Wiki_Name>.png,\n' +
      '     scaled to fit inside 640x480 (sips -Z 480 keeps alpha).\n' +
      '  2. Add the metric key to bossMetrics in src/components/MetricIcon.jsx.\n' +
      '  3. Add an import plus a bossIcons entry in src/components/OsrsIcons.jsx.\n' +
      '  Keep both lists alphabetical.'
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Boss coverage check failed to run: ${err.message}`);
  process.exitCode = 1;
});
