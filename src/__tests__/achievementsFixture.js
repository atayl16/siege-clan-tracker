// A made-up character's Wise Old Man snapshot, trimmed to what the
// Achievements tab reads.
const SKILLS = ["attack", "defence", "strength", "hitpoints", "ranged", "prayer", "magic", "cooking", "woodcutting", "fletching", "fishing", "firemaking", "crafting", "smithing", "mining", "herblore", "agility", "thieving", "slayer", "farming", "runecrafting", "hunter", "construction", "sailing"];

export function makePlayer({ levels = {}, xp = {}, bosses = {}, clues = {}, updatedAt = "2026-11-23T10:00:00.000Z" } = {}) {
  const skills = { overall: { metric: "overall", experience: 0, level: 0 } };
  for (const m of SKILLS) {
    skills[m] = { metric: m, level: levels[m] ?? 50, experience: xp[m] ?? 101333 };
  }
  skills.overall.experience = SKILLS.reduce((n, m) => n + Math.max(0, skills[m].experience), 0);
  return {
    updatedAt,
    latestSnapshot: {
      data: {
        skills,
        bosses: Object.fromEntries(Object.entries(bosses).map(([m, kills]) => [m, { metric: m, kills }])),
        activities: Object.fromEntries(Object.entries(clues).map(([t, score]) => [`clue_scrolls_${t}`, { score }])),
        computed: { ehb: { value: 612.4 }, ehp: { value: 1048.2 } },
      },
    },
  };
}
