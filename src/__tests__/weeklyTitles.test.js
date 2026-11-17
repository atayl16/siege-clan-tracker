import { describe, it, expect } from "vitest";
import {
  WEEKLY_TITLES,
  GAINER,
  TITLE_POINTS,
  RAID_METRICS,
  ALL_BOSSES,
  titleById,
  rankTitle,
  formatTitleValue,
  formatMinimum,
} from "../utils/weeklyTitles";

const row = (womId, value, name = `p${womId}`) => ({ womId, name, value });

describe("the title list", () => {
  it("has nine titles with unique ids, plus The Gainer", () => {
    expect(WEEKLY_TITLES).toHaveLength(9);
    const ids = WEEKLY_TITLES.map((t) => t.id);
    expect(new Set([...ids, GAINER.id]).size).toBe(10);
    expect(titleById("gainer")).toBe(GAINER);
    expect(titleById("raider").name).toBe("The Raider");
    expect(titleById("nope")).toBeNull();
  });

  it("pays 150 / 100 / 50", () => {
    expect(TITLE_POINTS).toEqual([150, 100, 50]);
  });

  it("counts every raid, the Fractured Archive included, and every boss", () => {
    expect(titleById("raider").metrics).toBe(RAID_METRICS);
    expect(RAID_METRICS).toContain("the_fractured_archive");
    expect(RAID_METRICS).toHaveLength(7);
    expect(titleById("boss_hunter").metrics).toBe(ALL_BOSSES);
  });
});

describe("rankTitle", () => {
  const clogger = titleById("clogger"); // minimum 5

  it("pays the top 3 over the minimum, highest first", () => {
    const ranked = rankTitle(clogger, [row(1, 9), row(2, 22), row(3, 16), row(4, 6), row(5, 4)]);
    expect(ranked.map((r) => [r.womId, r.place, r.points])).toEqual([
      [2, 1, 150],
      [3, 2, 100],
      [1, 3, 50],
    ]);
  });

  it("counts the minimum itself, but not one under it", () => {
    expect(rankTitle(clogger, [row(1, 5), row(2, 4.99)]).map((r) => r.womId)).toEqual([1]);
  });

  it("awards nobody when nobody reaches the minimum", () => {
    expect(rankTitle(clogger, [row(1, 4), row(2, 3)])).toEqual([]);
    expect(rankTitle(clogger, [])).toEqual([]);
    expect(rankTitle(clogger, undefined)).toEqual([]);
  });

  it("shares a tied place and its points (the Raider's tie for 3rd last week)", () => {
    const raider = titleById("raider");
    const ranked = rankTitle(raider, [row(1, 17), row(2, 13), row(3, 9), row(4, 9), row(5, 8)]);
    expect(ranked.map((r) => [r.womId, r.place, r.points])).toEqual([
      [1, 1, 150],
      [2, 2, 100],
      [3, 3, 50],
      [4, 3, 50],
    ]);
  });

  it("stops after 3rd even when a tie above pushes the count past three", () => {
    const ranked = rankTitle(clogger, [row(1, 10), row(2, 10), row(3, 8), row(4, 7)]);
    expect(ranked.map((r) => r.place)).toEqual([1, 1, 3]);
  });
});

describe("formatting", () => {
  it.each([
    ["warrior", 8.47, "8.5 EHB"],
    ["grinder", 28.93, "28.9 EHP"],
    ["clogger", 1, "1 slot"],
    ["clogger", 22, "22 slots"],
    ["clue_hunter", 1234, "1,234 clues"],
    ["resurrected", 310064, "310K XP"],
    ["slayer", 1020000, "1.02M XP"],
    ["raider", 9, "9 raids"],
    ["boss_hunter", 533, "533 kills"],
  ])("%s %s -> %s", (id, value, text) => {
    expect(formatTitleValue(titleById(id), value)).toBe(text);
  });

  it.each([
    ["warrior", "5 hours"],
    ["clue_hunter", "10 clues"],
    ["resurrected", "100K XP"],
    ["slayer", "150K XP"],
    ["boss_hunter", "100 kills"],
  ])("%s minimum reads %s", (id, text) => {
    expect(formatMinimum(titleById(id))).toBe(text);
  });
});
