import { render, screen, within, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const hookState = vi.hoisted(() => ({ value: null }));
vi.mock("../hooks/useWeeklyXp", () => ({ useWeeklyXp: () => hookState.value }));

import WeeklyXpLeaderboard, { YourWeeklyXp } from "../components/WeeklyXpLeaderboard";

const week = {
  start: new Date("2026-11-09T19:00:00Z"),
  end: new Date("2026-11-16T19:00:00Z"),
};
const standings = [
  { womId: 597199, name: "FinPunisher", gained: 9381451, place: 1, points: 15 },
  { womId: 2810612, name: "acid scum", gained: 4200000, place: 2, points: 10 },
  { womId: 323559, name: "Dan xo", gained: 731670, place: 3, points: 5 },
];

const ranking = [
  ...standings,
  { womId: 4, name: "Four", gained: 600000, place: 4, points: 2 },
  { womId: 5, name: "Five", gained: 500000, place: 5, points: 2 },
  { womId: 6, name: "Six", gained: 100000, place: 6, points: 0 },
  { womId: 777, name: "Far Down", gained: 12000, place: 7, points: 0 },
];

const state = (overrides = {}) => ({
  week,
  ranking,
  standings,
  loading: false,
  error: undefined,
  lastWeek: null,
  lastWeekError: undefined,
  ...overrides,
});

describe("WeeklyXpLeaderboard", () => {
  beforeEach(() => {
    hookState.value = state();
  });

  it("lists this week's top gainers with XP and the points they would earn", () => {
    render(<WeeklyXpLeaderboard />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("FinPunisher")).toBeInTheDocument();
    expect(within(rows[0]).getByText("9.38M XP")).toBeInTheDocument();
    expect(within(rows[0]).getByText("+15")).toBeInTheDocument();
    expect(screen.getByText(/Top 5 earn Siege Score · ends Mon 16 Nov, 19:00 UK/)).toBeInTheDocument();
  });

  it("marks the viewer's own character", () => {
    render(<WeeklyXpLeaderboard highlightIds={[323559]} />);
    const row = screen.getByText("Dan xo").closest("li");
    expect(row).toHaveClass("xp-week-row-yours");
    expect(within(row).getByText("You")).toBeInTheDocument();
  });

  it("says so when WOM cannot be reached", () => {
    hookState.value = state({ standings: [], error: new Error("429") });
    render(<WeeklyXpLeaderboard />);
    expect(screen.getByText(/Couldn't load this week's XP/)).toBeInTheDocument();
  });

  it("shows last week's paid winners on the full version", () => {
    hookState.value = state({
      lastWeek: {
        start: new Date("2026-11-09T19:00:00Z"),
        end: new Date("2026-11-16T19:00:00Z"),
        winners: [{ womId: 1, name: "Last Winner", gained: 5e6, place: 1, points: 15 }],
      },
    });
    render(<WeeklyXpLeaderboard variant="full" />);
    expect(screen.getByText("Last week's winners")).toBeInTheDocument();
    expect(screen.getByText("Last Winner")).toBeInTheDocument();
  });

  it("lists everyone gaining XP on the full version, with the paid places marked off", () => {
    hookState.value = state({ standings: ranking.filter((r) => r.points > 0) });
    render(<WeeklyXpLeaderboard variant="full" />);
    const thisWeek = () => within(screen.getAllByRole("list")[0]);
    expect(thisWeek().getAllByRole("listitem")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Show all 7 gaining XP" }));
    const rows = thisWeek().getAllByRole("listitem");
    expect(rows).toHaveLength(7);
    expect(within(rows[5]).getByText("Six")).toBeInTheDocument();
    expect(rows[5]).toHaveClass("xp-week-row-cutoff");
    expect(rows[4]).not.toHaveClass("xp-week-row-cutoff");
    expect(within(rows[5]).queryByText(/^\+/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show top 5" }));
    expect(thisWeek().getAllByRole("listitem")).toHaveLength(5);
  });

  it("offers no toggle in the Profile header, or when everyone is already shown", () => {
    hookState.value = state({ standings: ranking.filter((r) => r.points > 0) });
    const { unmount } = render(<WeeklyXpLeaderboard />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    unmount();

    hookState.value = state({ ranking: standings });
    render(<WeeklyXpLeaderboard variant="full" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains that nobody has been paid yet before the first week ends", () => {
    render(<WeeklyXpLeaderboard variant="full" />);
    expect(screen.getByText(/first winners are paid when this week ends/)).toBeInTheDocument();
  });
});

describe("YourWeeklyXp", () => {
  beforeEach(() => {
    hookState.value = state();
  });

  const line = () => screen.getByTestId("your-weekly-xp");

  it("in the top five: the points it would earn and the gap to the place above", () => {
    render(<YourWeeklyXp character={{ womId: 323559, name: "Dan xo" }} />);
    expect(line()).toHaveTextContent("3rd of 7 this week · 732K XP");
    expect(line()).toHaveTextContent("Tracking Dan xo");
    // 4,200,000 - 731,670 = 3,468,330
    expect(line()).toHaveTextContent("+5 Siege Score if it ends now · 3.47M XP to catch 2nd (+10)");
  });

  it("in first: how far ahead of second", () => {
    render(<YourWeeklyXp character={{ womId: 597199, name: "FinPunisher" }} />);
    // 9,381,451 - 4,200,000 = 5,181,451
    expect(line()).toHaveTextContent("+15 Siege Score if it ends now · 5.18M XP ahead of 2nd");
  });

  it("outside the top five: the gap to 5th and to the next place up", () => {
    render(<YourWeeklyXp character={{ womId: 777, name: "Far Down" }} />);
    expect(line()).toHaveTextContent("7th of 7 this week · 12K XP");
    // 500,000 - 12,000 to reach 5th; 100,000 - 12,000 to catch 6th
    expect(line()).toHaveTextContent("488K XP to reach 5th (+2 Siege Score) · 88K to catch 6th");
  });

  it("with nothing gained yet: the gap to 5th", () => {
    render(<YourWeeklyXp character={{ womId: 1, name: "Idle" }} />);
    expect(line()).toHaveTextContent("Idle has no XP gained yet this week");
    expect(line()).toHaveTextContent("500K XP to reach 5th (+2 Siege Score)");
  });

  it("early in the week, when the top five is not full: any XP gets in", () => {
    hookState.value = state({ ranking: standings.slice(0, 2) });
    render(<YourWeeklyXp character={{ womId: 1, name: "Idle" }} />);
    expect(line()).toHaveTextContent("Gain any XP to place 3rd (+5 Siege Score)");
  });

  it("asks a member with no character to claim one", () => {
    render(<YourWeeklyXp character={null} />);
    expect(line()).toHaveTextContent("Claim a character to track your weekly XP");
  });

  it("copes with WOM being unreachable", () => {
    hookState.value = state({ ranking: [], standings: [], error: new Error("429") });
    render(<YourWeeklyXp character={{ womId: 323559, name: "Dan xo" }} />);
    expect(line()).toHaveTextContent("Weekly XP is unavailable right now");
  });
});
