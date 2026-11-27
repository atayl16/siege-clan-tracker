import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";
import { WEEKLY_TITLES } from "../utils/weeklyTitles";

let mockRaces = [];
vi.mock("../hooks/useWeeklyTitles", () => ({ useTitleRaces: () => ({ races: mockRaces, loading: false }) }));
import YourTitleRaces from "../components/YourTitleRaces";

const t = (id) => WEEKLY_TITLES.find((x) => x.id === id);
const characters = [
  { womId: 1, name: "Test Main" },
  { womId: 2, name: "Test Alt" },
];
const renderCard = (props) => render(<MemoryRouter><YourTitleRaces characters={characters} {...props} /></MemoryRouter>);
const lines = () => screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("YourTitleRaces", () => {
  it("shows placing races first, then how far off the rest are, and leaves out races with no progress", () => {
    mockRaces = [
      { title: t("warrior"), rows: [{ womId: 9, value: 20 }, { womId: 8, value: 15 }, { womId: 7, value: 12 }, { womId: 1, value: 9 }] },
      { title: t("slayer"), rows: [{ womId: 2, value: 900000 }] },
      { title: t("clogger"), rows: [{ womId: 9, value: 30 }] },
      { title: t("grinder"), rows: [{ womId: 1, value: 4 }] },
    ];
    renderCard();
    expect(lines()).toEqual([
      "The SlayerTest Altof 11st+150",
      "The WarriorTest Main4th of 4 · 3.0 EHB behind 3rd",
      "The GrinderTest Main6.0 EHP more to enter",
    ]);
    expect(screen.queryByText(/The Clogger/)).toBeNull();
  });

  it("shows titles held now", () => {
    mockRaces = [];
    renderCard({ held: [t("warrior")] });
    expect(screen.getByText("Holding now")).toBeInTheDocument();
  });

  it("explains how to enter when there is no progress anywhere", () => {
    mockRaces = [{ title: t("warrior"), rows: [{ womId: 9, value: 9 }] }];
    renderCard();
    expect(lines()).toEqual([]);
    expect(screen.getByText(/No progress in a title race yet this week/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See every race" })).toHaveAttribute("href", "/leaderboard");
  });

  it("shows the best four and links to the rest", () => {
    mockRaces = ["warrior", "grinder", "clogger", "clue_hunter", "slayer"].map((id) => ({ title: t(id), rows: [{ womId: 1, value: 1e6 }] }));
    renderCard();
    expect(lines()).toHaveLength(4);
    expect(screen.getByRole("link", { name: "See all 5 of your races" })).toBeInTheDocument();
  });
});
