import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const tables = {};
const queried = [];
// Every .select() and .gt() filter, per table, for the tests to read.
const filters = {};
vi.mock("../supabaseClient", () => {
  const from = (table) => {
    queried.push(table);
    filters[table] = [];
    const builder = {
      select: (cols) => (filters[table].push(["select", cols]), builder),
      eq: () => builder,
      gt: (col, val) => (filters[table].push(["gt", col, val]), builder),
      order: () => builder,
      limit: () => builder,
      then: (resolve) => resolve({ data: tables[table] ?? [], error: null }),
    };
    return builder;
  };
  return { supabase: { from } };
});

import SiegeScoreBreakdown, { Breakdown } from "../components/SiegeScoreBreakdown";

const awards = [
  { kind: "event", id: 1, date: "2026-11-02T00:00:00Z", label: "1st in Test SotW", points: 150 },
  { kind: "xp", id: 2, date: "2026-11-09T19:00:00Z", label: "2nd in weekly XP", points: 100 },
  { kind: "title", id: 3, date: "2026-11-16T19:00:00Z", label: "1st for The Warrior", points: 150 },
  { kind: "event", id: 4, date: "2026-10-01T00:00:00Z", label: "Test BotW", points: 20 },
];

beforeEach(() => {
  queried.length = 0;
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(filters)) delete filters[k];
});

describe("SiegeScoreBreakdown", () => {
  it("loads nothing until opened", async () => {
    tables.event_results = [{ id: 1, placement: 1, points_awarded: 150, created_at: "2026-11-02", events: { name: "Test SotW", end_date: "2026-11-02" } }];
    render(<SiegeScoreBreakdown womId={7} total={150} />);
    expect(queried).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: /Where did my Siege Score come from/ }));
    expect(await screen.findByText("1st in Test SotW")).toBeInTheDocument();
    expect(queried.sort()).toEqual(["event_results", "siege_score_resets", "weekly_title_awards", "xp_awards"]);
  });

  it("counts only awards since the last reset, and says since when", async () => {
    tables.siege_score_resets = [{ reset_at: "2026-10-26T13:00:00Z" }];
    tables.event_results = [{ id: 1, placement: 1, points_awarded: 150, created_at: "2026-11-02", events: { name: "Test SotW", end_date: "2026-11-02" } }];
    render(<SiegeScoreBreakdown womId={7} total={150} />);
    await userEvent.click(screen.getByRole("button", { name: /Where did my Siege Score come from/ }));
    expect(await screen.findByText(/Since scores were last reset on/)).toBeInTheDocument();
    // Competitions by when they ended (an inner join, so the filter applies),
    // weekly awards by their week's end.
    expect(filters.event_results).toContainEqual(["gt", "events.end_date", "2026-10-26T13:00:00Z"]);
    expect(filters.event_results[0][1]).toMatch(/events!inner\(/);
    expect(filters.xp_awards).toContainEqual(["gt", "week_end", "2026-10-26T13:00:00Z"]);
    expect(filters.weekly_title_awards).toContainEqual(["gt", "week_end", "2026-10-26T13:00:00Z"]);
  });

  it("counts every award when no reset is recorded", async () => {
    render(<SiegeScoreBreakdown womId={7} total={0} />);
    await userEvent.click(screen.getByRole("button", { name: /Where did my Siege Score come from/ }));
    expect(await screen.findByText(/No Siege Score yet/)).toBeInTheDocument();
    expect(filters.event_results[0][1]).not.toMatch(/!inner/);
    expect(filters.event_results.map(([, col]) => col)).not.toContain("events.end_date");
    expect(filters.xp_awards.map(([, col]) => col)).not.toContain("week_end");
  });
});

describe("Breakdown", () => {
  it("totals each source, and shows points no award explains as other changes", () => {
    render(<Breakdown awards={awards} total={490} />);
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows.slice(0, 4)).toEqual(["Competitions (2)170", "Weekly XP (The Gainer) (1)100", "Weekly titles (1)150", "Other changes+70"]);
  });

  it("shows points removed since an award as a negative change, so the lines add up", () => {
    render(<Breakdown awards={awards} total={400} />);
    expect(screen.getByText("Other changes").closest("li")).toHaveTextContent("\u221220");
  });

  it("lists the most recent awards first", () => {
    render(<Breakdown awards={awards} total={420} />);
    const recent = screen.getAllByText(/^\+\d+$/).map((el) => el.closest("li").querySelector(".ssb-what").textContent);
    expect(recent).toEqual(["1st for The Warrior", "2nd in weekly XP", "1st in Test SotW", "Test BotW"]);
    expect(screen.queryByText("Other changes")).toBeNull();
  });

  it("says so when there is no Siege Score yet", () => {
    render(<Breakdown awards={[]} total={0} />);
    expect(screen.getByText(/No Siege Score yet/)).toBeInTheDocument();
  });
});
