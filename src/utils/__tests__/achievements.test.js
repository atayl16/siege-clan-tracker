import { describe, it, expect } from "vitest";
import { buildAchievements, closestFirst, orderRows, xpForLevel, combatLevel, bossName } from "../achievements";
import { makePlayer } from "../../__tests__/achievementsFixture";

const row = (a, key) => a.sections.flatMap((s) => s.rows).find((r) => r.key === key);

describe("xpForLevel", () => {
  it("matches the game's XP table", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(83);
    expect(xpForLevel(92)).toBe(6517253);
    expect(xpForLevel(99)).toBe(13034431);
  });
});

describe("combatLevel", () => {
  it("is 126 maxed and 3 for a new account", () => {
    const max = { attack: 99, strength: 99, defence: 99, hitpoints: 99, prayer: 99, ranged: 99, magic: 99 };
    expect(combatLevel(max)).toBe(126);
    expect(combatLevel({ attack: 1, strength: 1, defence: 1, hitpoints: 10, prayer: 1, ranged: 1, magic: 1 })).toBe(3);
  });
});

describe("buildAchievements", () => {
  it("returns nothing without a snapshot", () => {
    expect(buildAchievements(null)).toBeNull();
    expect(buildAchievements({})).toBeNull();
  });

  it("tracks a skill's level milestones by XP, then the XP ones", () => {
    const a = buildAchievements(makePlayer({ levels: { magic: 98 }, xp: { magic: 12_100_000 } }));
    const magic = row(a, "skill-magic");
    expect(magic.points.map((p) => p.label)).toEqual(["60", "70", "80", "90", "99", "50M", "100M", "200M"]);
    expect(magic.reached).toBe(4);
    expect(magic.next).toBe(4);
    expect(magic.nextLabel).toBe("99 Magic");
    expect(magic.sub).toBe("98 · 12.1M XP");
    // Between the 90 dot (3/7 of the way) and the 99 dot (4/7), most of the way.
    expect(magic.fill).toBeGreaterThan((3 / 7) * 100);
    expect(magic.fill).toBeLessThan((4 / 7) * 100);
  });

  it("works out total level, combat and base stats from the skills", () => {
    const a = buildAchievements(makePlayer({ levels: { attack: 99, strength: 99, defence: 90, hitpoints: 95, ranged: 92, magic: 94, prayer: 77, sailing: 12 } }));
    expect(a.stats.combat).toBe(combatLevel({ attack: 99, strength: 99, defence: 90, hitpoints: 95, prayer: 77, ranged: 92, magic: 94 }));
    expect(row(a, "base").sub).toBe("Base 12");
    expect(row(a, "total-level").points.at(-1).at).toBe(24 * 99);
    expect(a.stats.ehb).toBe(612);
  });

  it("lists only bosses the character has killed, and treats unranked (-1) as none", () => {
    const a = buildAchievements(makePlayer({ bosses: { vorkath: 1834, zulrah: -1, kreearra: 0, chambers_of_xeric: 161 } }));
    const bosses = a.sections.find((s) => s.key === "bosses").rows;
    expect(bosses.map((r) => r.name)).toEqual(["Vorkath", "Chambers of Xeric"]);
    expect(row(a, "boss-vorkath").nextLabel).toBe("2.5k Vorkath kills");
  });

  it("keeps the bar empty before the first milestone, and never moves it back", () => {
    const fillAt = (kills) => row(buildAchievements(makePlayer({ bosses: { vorkath: kills } })), "boss-vorkath").fill;
    expect(fillAt(49)).toBe(0);
    expect(fillAt(50)).toBe(0);
    expect(fillAt(75)).toBeCloseTo((0.5 / 6) * 100);
    expect(fillAt(100)).toBeCloseTo((1 / 6) * 100);
  });

  it("tracks clues in total and by tier, leaving out tiers never done", () => {
    const a = buildAchievements(makePlayer({ clues: { all: 318, hard: 101, master: -1 } }));
    expect(row(a, "clues-all").nextLabel).toBe("500 clue scrolls");
    expect(row(a, "clues-hard").reached).toBe(3);
    expect(row(a, "clues-master")).toBeUndefined();
    expect(row(a, "clues-easy")).toBeUndefined();
  });

  it("adds the other activities the character has done, and never Leagues", () => {
    const a = buildAchievements(
      makePlayer({ activities: { collections_logged: 305, guardians_of_the_rift: 0, soul_wars_zeal: -1, league_points: 9000 } })
    );
    const activities = a.sections.find((s) => s.key === "activities").rows.map((r) => r.key);
    expect(activities).toEqual(["activity-collections_logged"]);
    expect(row(a, "activity-collections_logged").nextLabel).toBe("500 slots (Collection log)");
    expect(row(a, "activity-collections_logged").points.map((p) => p.label)).toEqual(["100", "250", "500", "750", "1k", "1.25k", "1.5k"]);
  });

  it("shows a rating only once it has moved off the starting rating, with no milestones", () => {
    const a = buildAchievements(makePlayer({ activities: { last_man_standing: 1647, pvp_arena: 2500 } }));
    expect(row(a, "rating-last_man_standing")).toMatchObject({ kind: "rating", value: 1647, points: [] });
    expect(row(a, "rating-pvp_arena")).toBeUndefined();
  });

  it("tracks EHB and EHP in hours under Overall", () => {
    const a = buildAchievements(makePlayer());
    expect(row(a, "ehb")).toMatchObject({ value: 612, reached: 3, nextLabel: "1k EHB" });
    expect(row(a, "ehp").sub).toBe("1,048 hours");
  });

  it("counts milestones, names the nearest, and finds skillcapes", () => {
    const a = buildAchievements(
      makePlayer({ levels: { attack: 99, magic: 98, fletching: 89 }, xp: { attack: 15_000_000, magic: 12_900_000, fletching: 4_900_000 } })
    );
    const all = a.sections.flatMap((s) => s.rows);
    expect(a.total).toBe(all.reduce((n, r) => n + r.points.length, 0));
    expect(a.reached).toBe(all.reduce((n, r) => n + r.reached, 0));
    expect(a.nearest.nextLabel).toBe("99 Magic");
    expect(a.capes.earned).toEqual(["attack"]);
    expect(a.capes.closest[0].metric).toBe("magic");
    expect(a.capes.closest).toHaveLength(3);
  });
});

describe("orderRows", () => {
  const rows = [{ key: "b", name: "Zulrah", closeness: 0.2 }, { key: "a", name: "Abyssal Sire", closeness: 0.9 }];
  it("sorts by name, by closeness, or leaves game order", () => {
    expect(orderRows(rows, "alpha").map((r) => r.key)).toEqual(["a", "b"]);
    expect(orderRows(rows, "closest").map((r) => r.key)).toEqual(["a", "b"]);
    expect(orderRows(rows, "game")).toBe(rows);
  });
});

describe("closestFirst", () => {
  it("puts rows nearest their next milestone first and finished rows last", () => {
    const rows = [{ key: "a", closeness: 0.2 }, { key: "done", closeness: null }, { key: "b", closeness: 0.9 }];
    expect(closestFirst(rows).map((r) => r.key)).toEqual(["b", "a", "done"]);
  });
});

describe("bossName", () => {
  it("reads WOM's ids as names", () => {
    expect(bossName("chambers_of_xeric")).toBe("Chambers of Xeric");
    expect(bossName("kreearra")).toBe("Kree'Arra");
    expect(bossName("the_corrupted_gauntlet")).toBe("The Corrupted Gauntlet");
  });
});
