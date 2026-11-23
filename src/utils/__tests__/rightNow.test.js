import { describe, it, expect } from "vitest";
import { competitionLabel, runningCompetitions, upcomingCompetitions, recentCompetitionCount, dayOf, localWhen } from "../rightNow";

const now = Date.parse("2026-11-20T12:00:00Z");
const comp = (id, title, startsAt, endsAt) => ({ id, title, startsAt, endsAt });
const comps = [
  comp(1, "Siege SotW - Hunter", "2026-11-16T19:00:00Z", "2026-11-23T19:00:00Z"),
  comp(2, "Siege BotW - Vorkath", "2026-11-16T19:00:00Z", "2026-11-23T19:00:00Z"),
  comp(3, "Siege SotW - Smithing", "2026-11-23T19:00:00Z", "2026-11-30T19:00:00Z"),
  comp(4, "Siege SotW - Fishing", "2026-11-02T19:00:00Z", "2026-11-09T19:00:00Z"),
  comp(5, "Old one", "2026-08-01T19:00:00Z", "2026-08-08T19:00:00Z"),
  comp(6, "Far future", "2026-12-14T19:00:00Z", "2026-12-21T19:00:00Z"),
];

describe("rightNow", () => {
  it("reads the clan's competition titles", () => {
    expect(competitionLabel("Siege BotW - The Corrupted Gauntlet")).toEqual({ kind: "Boss of the Week", name: "The Corrupted Gauntlet" });
    expect(competitionLabel("Siege RotW - Tombs of Amascut (Expert)")).toEqual({ kind: "Raid of the Week", name: "Tombs of Amascut (Expert)" });
    expect(competitionLabel("Christmas special")).toEqual({ kind: null, name: "Christmas special" });
  });

  it("finds what is running, what starts within a week, and what finished in the last 30 days", () => {
    expect(runningCompetitions(comps, now).map((c) => c.id)).toEqual([1, 2]);
    expect(upcomingCompetitions(comps, now).map((c) => c.id)).toEqual([3]);
    expect(recentCompetitionCount(comps, now)).toBe(1);
  });

  it("counts the day of a week-long competition", () => {
    expect(dayOf(comps[0], now)).toBe("day 4 of 7");
  });

  it("says today or tomorrow for near times", () => {
    expect(localWhen(now + 60 * 60 * 1000, now)).toMatch(/^today, /);
  });
});
