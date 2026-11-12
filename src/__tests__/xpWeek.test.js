import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import {
  xpWeekContaining,
  lastCompletedXpWeek,
  rankXpGains,
  pointsForPlace,
  formatXp,
  ordinal,
  weeklyTargets,
} from "../utils/xpWeek";

const require = createRequire(import.meta.url);
const { weekSchedule } = require("../../scripts/comp-polls/ukTime.cjs");

const iso = (d) => d.toISOString();

describe("xpWeekContaining", () => {
  it("runs Monday 19:00 to Monday 19:00 UK (GMT in winter)", () => {
    const week = xpWeekContaining(new Date("2026-11-12T12:00:00Z")); // Thursday
    expect(iso(week.start)).toBe("2026-11-09T19:00:00.000Z");
    expect(iso(week.end)).toBe("2026-11-16T19:00:00.000Z");
  });

  it("keeps 19:00 on the UK clock in summer (18:00 UTC)", () => {
    const week = xpWeekContaining(new Date("2026-07-01T12:00:00Z"));
    expect(iso(week.start)).toBe("2026-06-29T18:00:00.000Z");
    expect(iso(week.end)).toBe("2026-07-06T18:00:00.000Z");
  });

  it("puts Monday before 19:00 in the previous week, and 19:00 itself in the new one", () => {
    expect(iso(xpWeekContaining(new Date("2026-11-16T18:59:59Z")).start)).toBe(
      "2026-11-09T19:00:00.000Z"
    );
    expect(iso(xpWeekContaining(new Date("2026-11-16T19:00:00Z")).start)).toBe(
      "2026-11-16T19:00:00.000Z"
    );
  });

  it("spans the October clock change", () => {
    // Clocks go back on Sun 25 Oct 2026: the week starts in BST, ends in GMT.
    const week = xpWeekContaining(new Date("2026-10-24T12:00:00Z"));
    expect(iso(week.start)).toBe("2026-10-19T18:00:00.000Z");
    expect(iso(week.end)).toBe("2026-10-26T19:00:00.000Z");
  });

  // SotW and BotW start at competitionStartsAt; the XP week must start at the
  // same instant every week of the year, BST or not.
  it("starts with the SotW/BotW competitions every week of the year", () => {
    for (let day = 0; day < 371; day += 7) {
      const pollMonday = new Date(Date.UTC(2026, 0, 5, 12) + day * 86400000);
      const { competitionStartsAt, competitionEndsAt } = weekSchedule(pollMonday);
      const week = xpWeekContaining(new Date(competitionStartsAt.getTime() + 3600000));
      expect(iso(week.start)).toBe(iso(competitionStartsAt));
      expect(iso(week.end)).toBe(iso(competitionEndsAt));
    }
  });
});

describe("lastCompletedXpWeek", () => {
  it("is the week before the current one", () => {
    const week = lastCompletedXpWeek(new Date("2026-11-16T19:17:00Z"));
    expect(iso(week.start)).toBe("2026-11-09T19:00:00.000Z");
    expect(iso(week.end)).toBe("2026-11-16T19:00:00.000Z");
  });
});

const row = (id, gained, name = `p${id}`) => ({
  player: { id, username: name.toLowerCase(), displayName: name },
  data: { gained },
});

describe("rankXpGains", () => {
  it("takes the top five with a gain and pays 15/10/5/2/2", () => {
    const rows = [row(1, 900), row(2, 800), row(3, 700), row(4, 600), row(5, 500), row(6, 400), row(7, 0)];
    const ranked = rankXpGains(rows);
    expect(ranked.map((r) => [r.womId, r.place, r.points])).toEqual([
      [1, 1, 15],
      [2, 2, 10],
      [3, 3, 5],
      [4, 4, 2],
      [5, 5, 2],
    ]);
  });

  it("sorts rows WOM did not sort", () => {
    expect(rankXpGains([row(1, 5), row(2, 50)])[0].womId).toBe(2);
  });

  it("shares a place on equal gains, and the next player skips ahead", () => {
    const ranked = rankXpGains([row(1, 900), row(2, 800), row(3, 800), row(4, 700)]);
    expect(ranked.map((r) => [r.womId, r.place, r.points])).toEqual([
      [1, 1, 15],
      [2, 2, 10],
      [3, 2, 10],
      [4, 4, 2],
    ]);
  });

  it("moves the next player up when someone cannot be paid", () => {
    const ranked = rankXpGains([row(1, 900), row(2, 800), row(3, 700)], {
      isEligible: (r) => r.player.id !== 1,
    });
    expect(ranked.map((r) => [r.womId, r.place])).toEqual([
      [2, 1],
      [3, 2],
    ]);
  });

  it("uses the display name", () => {
    expect(rankXpGains([row(1, 10, "Dan xo")])[0].name).toBe("Dan xo");
  });

  it("copes with no data", () => {
    expect(rankXpGains(undefined)).toEqual([]);
  });
});

describe("pointsForPlace and formatXp", () => {
  it("pays nothing past fifth", () => {
    expect(pointsForPlace(6)).toBe(0);
  });

  it.each([
    [9381451, "9.38M"],
    [2000000, "2M"],
    [512345, "512K"],
    [900, "900"],
  ])("%s -> %s", (xp, label) => {
    expect(formatXp(xp)).toBe(label);
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"],
    [13, "13th"], [21, "21st"], [22, "22nd"], [31, "31st"], [111, "111th"],
  ])("%s -> %s", (n, label) => {
    expect(ordinal(n)).toBe(label);
  });
});

describe("weeklyTargets", () => {
  const ranked = rankXpGains(
    [row(1, 900), row(2, 800), row(3, 800), row(4, 700), row(5, 600), row(6, 500), row(7, 400)],
    { limit: Infinity }
  );

  it("measures the gap to the closest player ahead, not one tied with you", () => {
    const { next } = weeklyTargets(ranked, 3); // tied 2nd with player 2
    expect(next).toMatchObject({ place: 1, gap: 100, points: 15 });
  });

  it("points someone outside the paid places at the last paid place", () => {
    const { topFive, next } = weeklyTargets(ranked, 7);
    expect(topFive).toEqual({ place: 5, points: 2, gap: 200, open: false });
    expect(next).toMatchObject({ place: 6, gap: 100 });
  });

  it("gives no top-five target to someone already in it", () => {
    expect(weeklyTargets(ranked, 4).topFive).toBeNull();
  });

  it("gives the leader their lead over second", () => {
    expect(weeklyTargets(ranked, 1).lead).toBe(100);
  });

  it("treats a player with no gain as needing the whole gap", () => {
    const t = weeklyTargets(ranked, 999);
    expect(t.mine).toBeNull();
    expect(t.topFive.gap).toBe(600);
  });

  it("says any gain gets in while the paid places are not full", () => {
    expect(weeklyTargets(ranked.slice(0, 3), 999).topFive).toEqual({
      place: 4,
      points: 2,
      gap: 1,
      open: true,
    });
  });
});
