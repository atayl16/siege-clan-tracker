import { render, screen, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const hooks = vi.hoisted(() => ({ races: null, holders: null }));
vi.mock("../hooks/useWeeklyTitles", () => ({
  useTitleRaces: () => hooks.races,
  useTitleHolders: () => hooks.holders,
}));

import PlaceBadge from "../components/PlaceBadge";
import { TitleHolders, TitleRaces, TitleBadges } from "../components/WeeklyTitles";
import { WEEKLY_TITLES, GAINER, titleById, rankTitle } from "../utils/weeklyTitles";

const row = (womId, name, value) => ({ womId, name, value });

describe("PlaceBadge", () => {
  it.each([
    [1, "1st place"],
    [2, "2nd place"],
    [3, "3rd place"],
  ])("place %s is a rosette labelled %s", (place, label) => {
    render(<PlaceBadge place={place} />);
    const badge = screen.getByRole("img", { name: label });
    expect(badge).toHaveClass("place-badge-rosette", `place-badge-${place}`);
    expect(badge).toHaveTextContent(String(place));
  });

  it("is a plain numbered circle below 3rd", () => {
    render(<PlaceBadge place={4} />);
    const badge = screen.getByRole("img", { name: "4th place" });
    expect(badge).toHaveClass("place-badge-circle");
    expect(badge).not.toHaveClass("place-badge-rosette");
  });
});

describe("TitleRaces", () => {
  const races = (overrides = {}) =>
    WEEKLY_TITLES.map((title) => ({ title, top: [], entrants: 0, ...(overrides[title.id] || {}) }));

  beforeEach(() => {
    hooks.races = { races: races(), updatedAt: null, loading: false, error: undefined };
  });

  it("shows a card for every title, in the config's order", () => {
    render(<TitleRaces />);
    const cards = screen.getAllByRole("region", { name: /race$/ });
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual(WEEKLY_TITLES.map((t) => `${t.name} race`));
  });

  it("lists the top 3 with their badge, value and points, and the minimum", () => {
    const raider = titleById("raider");
    const top = rankTitle(raider, [row(1, "1819 B", 17), row(2, "Hezz", 13), row(3, "elegant hobo", 9), row(4, "Sloth Bone", 9)]);
    hooks.races = { ...hooks.races, races: races({ raider: { top, entrants: 7 } }) };
    render(<TitleRaces />);

    const card = screen.getByRole("region", { name: "The Raider race" });
    expect(within(card).getByText(/minimum 5 raids/)).toBeInTheDocument();
    const rows = within(card).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByRole("img", { name: "1st place" })).toBeInTheDocument();
    expect(within(rows[0]).getByText("17 raids")).toBeInTheDocument();
    expect(within(rows[0]).getByText("+150")).toBeInTheDocument();
    // The tie for 3rd: both get the bronze rosette and 50.
    expect(within(rows[3]).getByRole("img", { name: "3rd place" })).toBeInTheDocument();
    expect(within(rows[3]).getByText("+50")).toBeInTheDocument();
    expect(within(card).getByText("7 members in the race this week")).toBeInTheDocument();
  });

  it("says when fewer than 3 are over the minimum, or nobody is", () => {
    const resurrected = titleById("resurrected");
    const top = rankTitle(resurrected, [row(1, "IlZion", 310064), row(2, "resnesv2", 206444), row(3, "fgiml", 51000)]);
    hooks.races = { ...hooks.races, races: races({ resurrected: { top, entrants: 3 } }) };
    render(<TitleRaces />);

    const card = screen.getByRole("region", { name: "The Resurrected race" });
    expect(within(card).getByText("Nobody else over the minimum yet")).toBeInTheDocument();
    const empty = screen.getByRole("region", { name: "The Warrior race" });
    expect(within(empty).getByText("Nobody over the minimum yet")).toBeInTheDocument();
    expect(within(empty).getByText("Nobody in the race yet this week")).toBeInTheDocument();
  });

  it("says when the races cannot be loaded", () => {
    hooks.races = { races: [], updatedAt: null, loading: false, error: new Error("down") };
    render(<TitleRaces />);
    expect(screen.getByText(/Couldn't load this week's races/)).toBeInTheDocument();
  });
});

describe("TitleHolders", () => {
  const week = { start: new Date("2026-11-09T19:00:00Z"), end: new Date("2026-11-16T19:00:00Z") };

  it("shows The Gainer first, then each title that has a holder", () => {
    hooks.holders = {
      loading: false,
      error: undefined,
      byMember: new Map(),
      holders: [
        { title: GAINER, players: [{ womId: 1, name: "FinPunisher", value: 16314915 }], week },
        { title: titleById("warrior"), players: [{ womId: 2, name: "noon air", value: 8.47 }], week },
        { title: titleById("raider"), players: [{ womId: 3, name: "A", value: 9 }, { womId: 4, name: "B", value: 9 }], week },
      ],
    };
    render(<TitleHolders />);
    const tiles = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(tiles.map((t) => t.querySelector(".title-holder-title").textContent)).toEqual([
      "The Gainer",
      "The Warrior",
      "The Raider",
    ]);
    expect(within(tiles[0]).getByText("16.31M XP")).toBeInTheDocument();
    expect(within(tiles[2]).getByText("A & B")).toBeInTheDocument();
    expect(screen.getByText(/Won Mon 9 Nov, 19:00 to Mon 16 Nov, 19:00 UK/)).toBeInTheDocument();
  });

  it("explains that nothing has been awarded yet", () => {
    hooks.holders = { loading: false, error: undefined, byMember: new Map(), holders: [] };
    render(<TitleHolders />);
    expect(screen.getByText("The first titles are awarded when this week ends.")).toBeInTheDocument();
  });
});

describe("TitleBadges", () => {
  it("shows every title a member holds, and nothing for a member who holds none", () => {
    const byMember = new Map([[7, ["The Clogger", "The Clue Hunter"]]]);
    const { container, rerender } = render(<TitleBadges womId="7" byMember={byMember} />);
    expect(screen.getByText("The Clogger")).toBeInTheDocument();
    expect(screen.getByText("The Clue Hunter")).toBeInTheDocument();
    rerender(<TitleBadges womId={8} byMember={byMember} />);
    expect(container).toBeEmptyDOMElement();
  });
});
