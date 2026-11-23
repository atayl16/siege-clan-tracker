import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

let mockCompetitions;
vi.mock("swr", () => ({ default: () => ({ data: mockCompetitions }) }));
let mockRanking = [];
const weeklyXpCalls = [];
vi.mock("../hooks/useWeeklyXp", () => ({
  useWeeklyXp: (opts) => {
    weeklyXpCalls.push(opts);
    return { week: { end: new Date(Date.now() + 3 * 864e5) }, ranking: mockRanking };
  },
}));
import RightNow from "../components/RightNow";

const day = 864e5;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();
const renderIt = () => render(<MemoryRouter><RightNow /></MemoryRouter>);

describe("RightNow", () => {
  it("shows this week's competitions, the next ones, the week's end and the XP leader", () => {
    mockCompetitions = [
      { id: 1, title: "Siege SotW - Hunter", startsAt: iso(-3), endsAt: iso(4) },
      { id: 2, title: "Siege SotW - Smithing", startsAt: iso(4), endsAt: iso(11) },
      { id: 4, title: "Siege BotW - Zulrah", startsAt: iso(6), endsAt: iso(13) },
      { id: 3, title: "Siege BotW - Vorkath", startsAt: iso(-12), endsAt: iso(-5) },
    ];
    mockRanking = [{ name: "Test Player", gained: 19210000 }];
    renderIt();
    expect(screen.getByRole("heading", { name: /Right Now/ })).toBeInTheDocument();
    expect(screen.getByText("Skill of the Week")).toBeInTheDocument();
    expect(screen.getByText("Hunter")).toBeInTheDocument();
    expect(screen.getByText("Smithing")).toBeInTheDocument();
    // Zulrah starts later than Smithing, so it is not under Smithing's time.
    expect(screen.queryByText(/Zulrah/)).toBeNull();
    expect(screen.getByText("Test Player")).toBeInTheDocument();
    expect(screen.getByText("19.21M XP gained this week")).toBeInTheDocument();
    expect(screen.getByText("1 competition")).toBeInTheDocument();
    // Loaded once: the home page does not poll the XP race.
    expect(weeklyXpCalls.at(-1)).toEqual({ poll: false });
  });

  it("leaves out tiles with nothing to show", () => {
    mockCompetitions = [];
    mockRanking = [];
    renderIt();
    expect(screen.queryByText("Leading weekly XP")).toBeNull();
    expect(screen.queryByText(/This week ·/)).toBeNull();
    expect(screen.getByText("Week ends")).toBeInTheDocument();
  });
});
