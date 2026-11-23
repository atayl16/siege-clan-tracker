/**
 * Milestones for the profile's Achievements tab, worked out from one
 * character's Wise Old Man snapshot (GET /api/wom-player, which the site
 * already uses and caches at the edge). Nothing is stored; the same
 * snapshot always gives the same result.
 *
 * Each row is a track of milestones: a value (XP, level, kills or clues),
 * the milestones along it, which are reached, which is next, and how far
 * along the bar is.
 */

const MAX_XP = 200_000_000;

/** OSRS XP needed for a level (1-99). */
export function xpForLevel(level) {
  let points = 0;
  for (let l = 1; l < level; l++) points += Math.floor(l + 300 * 2 ** (l / 7));
  return Math.floor(points / 4);
}

const LEVEL_99_XP = xpForLevel(99);

const fmt = (n) => {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return String(n);
};

/** "176.3M", "12.1M", "950k": for the line under a row's name. */
export const formatAmount = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
};

const SKILL_LEVELS = [60, 70, 80, 90, 99];
const SKILL_XP = [50e6, 100e6, MAX_XP];
const BOSS_KILLS = [50, 100, 250, 500, 1000, 2500, 5000];
const CLUES_ALL = [50, 100, 250, 500, 1000, 2500];
const CLUES_TIER = [10, 50, 100, 250, 500, 1000];
const CLUE_TIERS = ["beginner", "easy", "medium", "hard", "elite", "master"];

const SKILL_NAME = { runecrafting: "Runecraft" };
const skillName = (metric) => SKILL_NAME[metric] ?? metric.charAt(0).toUpperCase() + metric.slice(1);

// Names WOM's ids do not spell out.
const BOSS_NAME = {
  chambers_of_xeric_challenge_mode: "Chambers of Xeric: CM",
  theatre_of_blood_hard_mode: "Theatre of Blood: HM",
  tombs_of_amascut_expert: "Tombs of Amascut: Expert",
  kreearra: "Kree'Arra",
  kril_tsutsaroth: "K'ril Tsutsaroth",
  tztok_jad: "TzTok-Jad",
  tzkal_zuk: "TzKal-Zuk",
  vetion: "Vet'ion",
  calvarion: "Calvar'ion",
  phosanis_nightmare: "Phosani's Nightmare",
  dagannoth_rex: "Dagannoth Rex",
  thermonuclear_smoke_devil: "Thermonuclear Smoke Devil",
  doom_of_mokhaiotl: "Doom of Mokhaiotl",
};
const SMALL_WORDS = new Set(["of", "the", "and", "in"]);

/** "chambers_of_xeric" -> "Chambers of Xeric". */
export function bossName(metric) {
  if (BOSS_NAME[metric]) return BOSS_NAME[metric];
  return metric
    .split("_")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * One track. Milestones are spaced evenly, the first at the start; the bar
 * runs through every reached one and part-way to the next, in proportion to
 * the value. Before the first milestone it stays empty: there is no segment
 * before the first dot to fill.
 */
function track({ key, kind, metric, name, sub, value, marks, labels, nextName }) {
  const points = marks.map((at, i) => ({ at, label: labels?.[i] ?? fmt(at), reached: value >= at }));
  const next = points.findIndex((p) => !p.reached);
  const reached = next === -1 ? points.length : next;
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;

  let fill = 100;
  let closeness = null; // value / next milestone, for "closest first"
  if (next !== -1) {
    if (next === 0) {
      fill = 0;
    } else {
      const from = points[next - 1].at;
      const part = points[next].at > from ? Math.min(1, Math.max(0, (value - from) / (points[next].at - from))) : 0;
      fill = (next - 1 + part) * step;
    }
    closeness = points[next].at > 0 ? Math.min(0.999, value / points[next].at) : 0;
  }

  return {
    key,
    kind,
    metric,
    name,
    sub,
    value,
    points,
    next,
    reached,
    fill,
    closeness,
    nextLabel: next === -1 ? null : nextName(points[next].label),
  };
}

/** WOM gives -1 for a value too low to be ranked on the hiscores. */
const ranked = (n) => (typeof n === "number" && n > 0 ? n : 0);

/** OSRS combat level from the combat skills. */
export function combatLevel(lv) {
  const base = 0.25 * (lv.defence + lv.hitpoints + Math.floor(lv.prayer / 2));
  const melee = 0.325 * (lv.attack + lv.strength);
  const ranged = 0.325 * Math.floor(lv.ranged * 1.5);
  const magic = 0.325 * Math.floor(lv.magic * 1.5);
  return Math.floor(base + Math.max(melee, ranged, magic));
}

/**
 * @param {object} player - a WOM player (GET /api/wom-player): latestSnapshot.data
 *   has skills, bosses, activities and computed
 * @returns {null | {
 *   sections: Array<{ key: string, title: string, rows: object[] }>,
 *   reached: number, total: number, nearest: object | null,
 *   stats: { totalLevel: number, combat: number, ehb: number, ehp: number },
 *   capes: { earned: string[], closest: Array<{ metric: string, progress: number }> },
 *   updatedAt: string | null,
 * }}
 */
export function buildAchievements(player) {
  const data = player?.latestSnapshot?.data;
  if (!data?.skills) return null;

  const skillMetrics = Object.keys(data.skills).filter((m) => m !== "overall");
  const levelOf = (m) => Math.max(1, data.skills[m]?.level ?? 1);
  const xpOf = (m) => ranked(data.skills[m]?.experience);
  const levels = Object.fromEntries(skillMetrics.map((m) => [m, levelOf(m)]));
  const maxTotal = skillMetrics.length * 99;
  const totalLevel = skillMetrics.reduce((sum, m) => sum + levels[m], 0);
  const overallXp = ranked(data.skills.overall?.experience);
  const baseLevel = Math.min(...skillMetrics.map((m) => levels[m]));
  const combat = combatLevel(levels);

  const overall = [
    track({
      key: "overall-xp", kind: "overall", metric: "overall", name: "Overall XP", sub: `${formatAmount(overallXp)} XP`,
      value: overallXp,
      marks: [10e6, 25e6, 50e6, 100e6, 200e6, 500e6, 1e9, skillMetrics.length * MAX_XP],
      labels: ["10M", "25M", "50M", "100M", "200M", "500M", "1B", "Max"],
      nextName: (l) => `${l} overall XP`,
    }),
    track({
      key: "total-level", kind: "overall", metric: "overall", name: "Total level", sub: totalLevel.toLocaleString("en-GB"),
      value: totalLevel,
      marks: [500, 1000, 1250, 1500, 1750, 2000, 2200, maxTotal],
      labels: ["500", "1000", "1250", "1500", "1750", "2000", "2200", "Max"],
      nextName: (l) => (l === "Max" ? "Max total level" : `${l} total level`),
    }),
    track({
      key: "combat", kind: "overall", metric: "combat", name: "Combat level", sub: String(combat),
      value: combat, marks: [50, 70, 90, 100, 110, 120, 126],
      nextName: (l) => `Combat level ${l}`,
    }),
    track({
      key: "base", kind: "overall", metric: "base", name: "Base stats", sub: `Base ${baseLevel}`,
      value: baseLevel, marks: [40, 50, 60, 70, 80, 90, 99],
      nextName: (l) => `Base ${l} stats`,
    }),
  ];

  const skills = skillMetrics.map((m) =>
    track({
      key: `skill-${m}`, kind: "skill", metric: m, name: skillName(m),
      sub: `${levels[m]} · ${formatAmount(xpOf(m))} XP`,
      value: xpOf(m),
      marks: [...SKILL_LEVELS.map(xpForLevel), ...SKILL_XP],
      labels: [...SKILL_LEVELS.map(String), "50M", "100M", "200M"],
      nextName: (l) => `${l} ${skillName(m)}`,
    })
  );

  const bosses = Object.entries(data.bosses || {})
    .map(([m, b]) => [m, ranked(b?.kills)])
    .filter(([, kills]) => kills > 0)
    .map(([m, kills]) =>
      track({
        key: `boss-${m}`, kind: "boss", metric: m, name: bossName(m), sub: `${kills.toLocaleString("en-GB")} kills`,
        value: kills, marks: BOSS_KILLS, labels: ["50", "100", "250", "500", "1k", "2.5k", "5k"],
        nextName: (l) => `${l} ${bossName(m)} kills`,
      })
    );

  const clueScore = (tier) => ranked(data.activities?.[`clue_scrolls_${tier}`]?.score);
  const clues = [
    track({
      key: "clues-all", kind: "clue", metric: "clue_scrolls_all", name: "All tiers", sub: `${clueScore("all").toLocaleString("en-GB")} completed`,
      value: clueScore("all"), marks: CLUES_ALL, labels: ["50", "100", "250", "500", "1k", "2.5k"],
      nextName: (l) => `${l} clue scrolls`,
    }),
    ...CLUE_TIERS.map((tier) => {
      const name = tier.charAt(0).toUpperCase() + tier.slice(1);
      return track({
        key: `clues-${tier}`, kind: "clue", metric: `clue_scrolls_${tier}`, name, sub: `${clueScore(tier).toLocaleString("en-GB")} completed`,
        value: clueScore(tier), marks: CLUES_TIER, labels: ["10", "50", "100", "250", "500", "1k"],
        nextName: (l) => `${l} ${tier} clues`,
      });
    }),
  ];

  const sections = [
    { key: "overall", title: "Overall", rows: overall },
    { key: "skills", title: "Skills", rows: skills },
    { key: "bosses", title: "Bosses", rows: bosses },
    { key: "clues", title: "Clue scrolls", rows: clues },
  ];

  const all = sections.flatMap((s) => s.rows);
  const nearest = all
    .filter((r) => r.closeness !== null)
    .reduce((best, r) => (!best || r.closeness > best.closeness ? r : best), null);

  const earned = skillMetrics.filter((m) => levels[m] >= 99);
  const closest = skillMetrics
    .filter((m) => levels[m] < 99)
    .map((m) => ({ metric: m, progress: Math.min(0.999, xpOf(m) / LEVEL_99_XP) }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  return {
    sections,
    reached: all.reduce((n, r) => n + r.reached, 0),
    total: all.reduce((n, r) => n + r.points.length, 0),
    nearest,
    stats: {
      totalLevel,
      combat,
      ehb: Math.round(data.computed?.ehb?.value ?? 0),
      ehp: Math.round(data.computed?.ehp?.value ?? 0),
    },
    capes: { earned, closest },
    updatedAt: player.updatedAt ?? player.latestSnapshot?.createdAt ?? null,
  };
}

/** Rows nearest their next milestone first; finished rows last, in order. */
export function closestFirst(rows) {
  return [...rows].sort((a, b) => {
    if (a.closeness === null && b.closeness === null) return 0;
    if (a.closeness === null) return 1;
    if (b.closeness === null) return -1;
    return b.closeness - a.closeness;
  });
}

export { skillName };
