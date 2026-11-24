import React from "react";
import { render, screen, within } from "@testing-library/react";
import { vi, it, expect, beforeEach } from "vitest";

const DAY = 24 * 60 * 60 * 1000;
const iso = (offset) => new Date(Date.now() + offset).toISOString();

let competitions = [];
let leaders;
const requested = [];
vi.mock("swr", () => ({
  default: (key) => {
    requested.push(key);
    if (key === "/api/wom-competitions") return { data: competitions, error: null };
    if (key === "/api/wom-competition-leaders") return { data: leaders, error: null };
    return { data: undefined, error: null };
  },
}));

const { default: EventsTable, formatGain } = await import("../components/EventsTable");

beforeEach(() => {
  requested.length = 0;
  competitions = [
    { id: 21, title: "Siege SotW - Smithing", metric: "smithing", startsAt: iso(-DAY), endsAt: iso(5 * DAY) },
    { id: 22, title: "Siege BotW - Vorkath", metric: "vorkath", startsAt: iso(-DAY), endsAt: iso(4 * DAY) },
  ];
  leaders = [
    {
      competitionId: 21,
      top: [
        { place: 1, name: "Moon Fern", gained: 930319 },
        { place: 2, name: "Ash Vale", gained: 156690 },
        { place: 3, name: "Kel Brook", gained: 127825 },
      ],
    },
    { competitionId: 22, top: [] },
  ];
});

it("shows the top three under a running competition, with their gains", () => {
  render(<EventsTable events={[]} />);

  const list = screen.getByRole("list", { name: "Top 3 so far" });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(3);
  expect(items[0]).toHaveTextContent("Moon Fern");
  expect(items[0]).toHaveTextContent("930K XP");
  expect(within(items[0]).getByRole("img", { name: "1st place" })).toBeInTheDocument();
  expect(items[2]).toHaveTextContent("Kel Brook");
});

it("adds nothing under a competition no one has gained in yet", () => {
  render(<EventsTable events={[]} />);
  expect(screen.getAllByRole("list", { name: "Top 3 so far" })).toHaveLength(1);
});

it("matches a competition saved in the events table by its WOM id", () => {
  const [sotw] = competitions;
  render(
    <EventsTable
      events={[{ id: 7, name: sotw.title, metric: "smithing", wom_id: 21, start_date: sotw.startsAt, end_date: sotw.endsAt }]}
    />
  );
  expect(screen.getByText("Moon Fern")).toBeInTheDocument();
});

it("does not ask for standings when nothing is running", () => {
  competitions = [{ id: 23, title: "Siege SotW - Mining", metric: "mining", startsAt: iso(DAY), endsAt: iso(8 * DAY) }];
  render(<EventsTable events={[]} />);
  expect(requested).not.toContain("/api/wom-competition-leaders");
  expect(screen.queryByRole("list", { name: "Top 3 so far" })).toBeNull();
});

it("words a gain for the kind of competition", () => {
  expect(formatGain("smithing", 930319)).toBe("930K XP");
  expect(formatGain("overall", 2500000)).toBe("2.5M XP");
  expect(formatGain("vorkath", 1234)).toBe("1,234 KC");
  expect(formatGain("ehb", 4.25)).toBe("4.3 hrs");
});
