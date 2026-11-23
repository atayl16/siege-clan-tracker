import { describe, it, expect } from "vitest";
import { stampWeeks, lastWeeks } from "../components/EventStampCard";

const now = new Date("2026-11-20T12:00:00Z"); // the week of Mon 16 Nov, 19:00 UK

describe("EventStampCard weeks", () => {
  it("covers the last 12 clan weeks, oldest first, ending with this one", () => {
    const weeks = lastWeeks(now);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1).start.toISOString()).toBe("2026-11-16T19:00:00.000Z");
    for (let i = 1; i < weeks.length; i++) expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime());
  });

  it("keeps week boundaries at 19:00 UK across the October clock change", () => {
    const weeks = lastWeeks(now);
    // Summer time (19:00 BST = 18:00 UTC) before 25 Oct 2026, winter after.
    expect(weeks.find((w) => w.start.toISOString().startsWith("2026-10-19")).start.toISOString()).toBe("2026-10-19T18:00:00.000Z");
    expect(weeks.find((w) => w.start.toISOString().startsWith("2026-10-26")).start.toISOString()).toBe("2026-10-26T19:00:00.000Z");
  });

  it("stamps each week a character took part, once per week, by when the competition started", () => {
    const rows = [
      { events: { name: "Siege SotW - Hunter", start_date: "2026-11-16T19:00:00Z", end_date: "2026-11-23T19:00:00Z" } },
      { events: { name: "Siege BotW - Vorkath", start_date: "2026-11-16T19:00:00Z", end_date: "2026-11-23T19:00:00Z" } },
      { events: { name: "Siege SotW - Fishing", start_date: "2026-11-02T19:00:00Z", end_date: "2026-11-09T19:00:00Z" } },
      { events: { name: "Ancient", start_date: "2026-01-01T19:00:00Z", end_date: "2026-01-08T19:00:00Z" } },
    ];
    const weeks = stampWeeks(rows, now);
    expect(weeks.filter((w) => w.events.length)).toHaveLength(2);
    expect(weeks.at(-1).events).toEqual(["Siege SotW - Hunter", "Siege BotW - Vorkath"]);
  });
});
