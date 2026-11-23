import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const tables = {};
const queried = [];
vi.mock("../supabaseClient", () => {
  const from = (table) => {
    queried.push(table);
    const builder = {
      select: () => builder,
      eq: () => builder,
      gt: () => builder,
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
});

describe("SiegeScoreBreakdown", () => {
  it("loads nothing until opened", async () => {
    tables.event_results = [{ id: 1, placement: 1, points_awarded: 150, created_at: "2026-11-02", events: { name: "Test SotW", end_date: "2026-11-02" } }];
    render(<SiegeScoreBreakdown womId={7} total={150} />);
    expect(queried).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: /Where did my Siege Score come from/ }));
    expect(queried.sort()).toEqual(["event_results", "weekly_title_awards", "xp_awards"]);
    expect(await screen.findByText("1st in Test SotW")).toBeInTheDocument();
  });
});

describe("Breakdown", () => {
  it("totals each source and shows unrecorded points as added by staff", () => {
    render(<Breakdown awards={awards} total={490} />);
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows.slice(0, 4)).toEqual(["Competitions (2)170", "Weekly XP (The Gainer) (1)100", "Weekly titles (1)150", "Added by staff70"]);
  });

  it("lists the most recent awards first", () => {
    render(<Breakdown awards={awards} total={420} />);
    const recent = screen.getAllByText(/^\+\d+$/).map((el) => el.closest("li").querySelector(".ssb-what").textContent);
    expect(recent).toEqual(["1st for The Warrior", "2nd in weekly XP", "1st in Test SotW", "Test BotW"]);
    expect(screen.queryByText("Added by staff")).toBeNull();
  });

  it("says so when there is no Siege Score yet", () => {
    render(<Breakdown awards={[]} total={0} />);
    expect(screen.getByText(/No Siege Score yet/)).toBeInTheDocument();
  });
});
