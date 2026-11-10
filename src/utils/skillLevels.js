/**
 * OSRS skill levels and the XP they start at.
 *
 * Goals and WOM both measure skills in XP; levels are worked out from it with
 * the game's own experience table, so a goal set as "reach 85" is stored as
 * the XP for level 85 and tracked like any other XP goal.
 */

export const MAX_LEVEL = 99;

// WOM's skill metrics. Race participants store only the metric, so this tells
// a skill row from a boss row.
export const SKILL_METRICS = new Set([
  "overall", "attack", "defence", "strength", "hitpoints", "ranged", "prayer",
  "magic", "cooking", "woodcutting", "fletching", "fishing", "firemaking",
  "crafting", "smithing", "mining", "herblore", "agility", "thieving", "slayer",
  "farming", "runecrafting", "hunter", "construction", "sailing",
]);

// XP_TABLE[level] is the XP needed to reach that level (XP_TABLE[1] = 0).
const XP_TABLE = (() => {
  const table = [0, 0];
  let points = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * 2 ** (level / 7));
    table.push(Math.floor(points / 4));
  }
  return table;
})();

/** The XP a level starts at. Levels outside 1-99 are clamped. */
export function xpForLevel(level) {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return XP_TABLE[clamped];
}

/** The level a given amount of XP gives, from 1 to 99. */
export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && XP_TABLE[level + 1] <= xp) level++;
  return level;
}

/**
 * Whether a skill's goals can be set by level. Overall's "level" in WOM is the
 * total level (up to 2,277), which this table does not describe.
 */
export function hasLevels(metric) {
  return Boolean(metric) && metric !== "overall";
}
