/**
 * Wording for RuneProfile activities (see netlify/edge-functions/
 * _shared/runeprofile.js). RuneProfile names everything ("enriched"), so
 * nothing here needs its own item, quest or diary lists.
 */

const fmt = (n) => {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
};

/**
 * @param {{ type: string, data?: object, enriched?: object|null }} activity
 * @returns {{ kind: string, text: string, skill?: string }}
 *   kind picks the icon; skill is set for level and XP milestones
 */
export function describeActivity(activity) {
  const d = activity.data || {};
  const e = activity.enriched || {};
  switch (activity.type) {
    case "new_item_obtained":
      return { kind: "item", text: `New collection log item: ${e.itemName || "an item"}` };
    case "valuable_drop":
      return { kind: "drop", text: `Valuable drop: ${e.itemName || "an item"}${d.value ? ` (${fmt(d.value)} gp)` : ""}` };
    case "quest_completed":
      return { kind: "quest", text: `Completed ${e.questName || "a quest"}` };
    case "achievement_diary_tier_completed":
      return { kind: "diary", text: `Completed the ${[e.tierName, e.areaName].filter(Boolean).join(" ") || "an achievement"} diary` };
    case "combat_achievement_task_completed":
      return { kind: "ca", text: `Combat achievement: ${e.taskName || "a task"}${e.tierName ? ` (${e.tierName})` : ""}` };
    case "combat_achievement_tier_completed":
      return { kind: "ca", text: `Finished every ${e.tierName || ""} combat achievement`.replace("  ", " ") };
    case "combat_achievement_tier_reached":
      return { kind: "ca", text: `Reached ${e.tierName || "a new"} combat achievement rewards` };
    case "level_up":
      return { kind: "level", text: `Reached ${d.level} ${d.name}`, skill: d.name };
    case "xp_milestone":
      return { kind: "xp", text: `${fmt(d.xp)} ${d.name} XP`, skill: d.name };
    case "maxed":
      return { kind: "maxed", text: "Maxed every skill" };
    default:
      return { kind: "other", text: String(activity.type || "").replace(/_/g, " ") };
  }
}

/**
 * When it happened. RuneProfile sends "2026-11-23 14:53:40.772003", which
 * is UTC but has no zone marker, so parse it as UTC explicitly. null for
 * anything that does not parse, so one bad timestamp cannot break a list.
 */
export function activityDate(createdAt) {
  if (!createdAt) return null;
  const iso = String(createdAt).replace(" ", "T");
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const RUNEPROFILE_URL = "https://www.runeprofile.com";
// How to install the RuneLite plugin and start sharing activity.
export const RUNEPROFILE_GUIDE_URL = "https://www.runeprofile.com/info/guide";
