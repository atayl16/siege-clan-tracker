/**
 * Weekly titles: the single source of truth.
 *
 * Every week (the XP week in ./xpWeek.js: Monday 19:00 to Monday 19:00 UK)
 * each title is a race. The top 3 at or over the title's minimum earn
 * TITLE_POINTS Siege Score and 1st holds the title until the next week is
 * awarded. Nobody below 3rd earns anything, and a title nobody qualifies for
 * is not awarded that week.
 *
 * The hourly job (scripts/sync-tasks/weekly-titles.cjs) and the site both read
 * this file, so changing a title, a minimum or the points here changes both:
 * no database change is needed. A new raid or boss metric needs adding to
 * RAID_METRICS (The Boss Hunter picks up every boss WOM tracks by itself).
 */

/** Points by place: 1st, 2nd, 3rd. Owner's decision, 2026-11-17. */
export const TITLE_POINTS = [150, 100, 50];
export const TITLE_PLACES = TITLE_POINTS.length;

/** The Resurrected: no Overall XP at all in this many weeks before the week. */
export const RESURRECT_IDLE_WEEKS = 4;

/** WOM metrics The Raider adds up: every raid and its harder modes. */
export const RAID_METRICS = [
  "chambers_of_xeric",
  "chambers_of_xeric_challenge_mode",
  "theatre_of_blood",
  "theatre_of_blood_hard_mode",
  "tombs_of_amascut",
  "tombs_of_amascut_expert",
  "the_fractured_archive",
];

/** Stand-in for "every boss metric WOM tracks", resolved from WOM at run time. */
export const ALL_BOSSES = "all_bosses";

/**
 * The titles, in display order.
 *
 *   id         stable key stored in the database; never rename
 *   metrics    WOM metrics added together, or ALL_BOSSES
 *   minimum    the least that can place (inclusive)
 *   unit       how a value reads: "xp", "hours" (with label), or a count noun
 *   icon       which icon the site draws (see TitleIcon)
 *   idleWeeks  only players with no Overall XP in that many weeks before
 */
export const WEEKLY_TITLES = [
  { id: "warrior", name: "The Warrior", ranked: "Most EHB", metrics: ["ehb"], minimum: 5, unit: { hours: "EHB" }, icon: "sword" },
  { id: "grinder", name: "The Grinder", ranked: "Most EHP", metrics: ["ehp"], minimum: 10, unit: { hours: "EHP" }, icon: "pickaxe" },
  { id: "clogger", name: "The Clogger", ranked: "Most collection log slots", metrics: ["collections_logged"], minimum: 5, unit: { count: ["slot", "slots"] }, icon: "book" },
  { id: "clue_hunter", name: "The Clue Hunter", ranked: "Most clue scrolls, all tiers", metrics: ["clue_scrolls_all"], minimum: 10, unit: { count: ["clue", "clues"] }, icon: "scroll" },
  { id: "resurrected", name: "The Resurrected", ranked: `Most XP after ${RESURRECT_IDLE_WEEKS}+ quiet weeks`, metrics: ["overall"], minimum: 100000, unit: "xp", icon: "sunrise", idleWeeks: RESURRECT_IDLE_WEEKS },
  { id: "slayer", name: "The Slayer", ranked: "Most Slayer XP", metrics: ["slayer"], minimum: 150000, unit: "xp", icon: "skull" },
  { id: "sailor", name: "The Sailor", ranked: "Most Sailing XP", metrics: ["sailing"], minimum: 100000, unit: "xp", icon: "sailboat" },
  { id: "raider", name: "The Raider", ranked: "Most raids, all four raids", metrics: RAID_METRICS, minimum: 5, unit: { count: ["raid", "raids"] }, icon: "shield" },
  { id: "boss_hunter", name: "The Boss Hunter", ranked: "Most boss kills, every boss", metrics: ALL_BOSSES, minimum: 100, unit: { count: ["kill", "kills"] }, icon: "crosshair" },
];

/**
 * The weekly XP award's winner holds a title too. It is not one of the races
 * above: it keeps its own top-5 points (XP_AWARD_POINTS in ./xpWeek.js), has
 * no minimum, and is awarded by scripts/sync-tasks/weekly-xp-awards.cjs.
 */
export const GAINER = { id: "gainer", name: "The Gainer", ranked: "Most Overall XP", unit: "xp", icon: "trend" };

export function titleById(id) {
  if (id === GAINER.id) return GAINER;
  return WEEKLY_TITLES.find((t) => t.id === id) || null;
}

/** 9381451 -> "9.38M", 512345 -> "512K", 900 -> "900". */
function compactNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

/** A value as it reads on the page: "8.5 EHB", "310K XP", "22 slots", "1 raid". */
export function formatTitleValue(title, value) {
  const n = Number(value) || 0;
  if (title.unit === "xp") return `${compactNumber(n)} XP`;
  if (title.unit.hours) return `${(Math.round(n * 10) / 10).toFixed(1)} ${title.unit.hours}`;
  const [one, many] = title.unit.count;
  return `${Math.round(n).toLocaleString("en-GB")} ${Math.round(n) === 1 ? one : many}`;
}

/** The minimum as it reads: "minimum 5 hours", "minimum 100K XP", "minimum 10 clues". */
export function formatMinimum(title) {
  if (title.unit.hours) return `${title.minimum} hours`;
  return formatTitleValue(title, title.minimum);
}

/**
 * Rank one title's rows ({ womId, name, value }, already limited to eligible
 * members) for the week: only values at or over the minimum, highest first.
 * Equal values share a place and its points; the next player skips ahead
 * (1, 2, 2, 4). Returns only the places that earn points.
 */
export function rankTitle(title, rows) {
  const sorted = (rows || [])
    .filter((r) => r && r.value > 0 && r.value >= title.minimum)
    .sort((a, b) => b.value - a.value);

  const ranked = [];
  for (let i = 0; i < sorted.length; i++) {
    const place = i > 0 && sorted[i].value === sorted[i - 1].value ? ranked[i - 1].place : i + 1;
    if (place > TITLE_PLACES) break;
    ranked.push({ ...sorted[i], place, points: TITLE_POINTS[place - 1] });
  }
  return ranked;
}
