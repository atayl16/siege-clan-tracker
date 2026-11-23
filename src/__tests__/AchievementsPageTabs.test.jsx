import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("../hooks/useGroupAchievements", () => ({
  useGroupAchievements: () => ({ data: [], isLoading: false, error: null }),
}));
const useClanActivity = vi.fn(() => ({
  activities: [
    { type: "valuable_drop", data: { value: 5e6 }, enriched: { itemName: "Test Item" }, createdAt: "2026-11-23 10:00:00", username: "Test Player" },
    { type: "quest_completed", enriched: { questName: "Test Quest" }, createdAt: "2026-11-22 10:00:00", username: "Test Other" },
  ],
  loading: false,
  error: null,
}));
vi.mock("../hooks/useRuneProfile", () => ({ useClanActivity: (...args) => useClanActivity(...args) }));

import AchievementsPage from "../pages/AchievementsPage";

describe("Achievements page tabs", () => {
  it("opens on Milestones and loads clan activity only when its tab is opened", async () => {
    useClanActivity.mockClear();
    render(<AchievementsPage />);
    expect(screen.getByRole("heading", { name: "Clan Achievements" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search achievements or players...")).toBeInTheDocument();
    expect(useClanActivity).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Clan Activity" }));
    expect(useClanActivity).toHaveBeenCalledWith("page");
    expect(screen.getByText(/Valuable drop: Test Item/)).toBeInTheDocument();
  });

  it("searches clan activity by player or by what happened", async () => {
    render(<AchievementsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Clan Activity" }));
    await userEvent.type(screen.getByPlaceholderText(/Search drops, quests or players/), "quest");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/Completed Test Quest/)).toBeInTheDocument();
  });

  it("clears the search with its clear button", async () => {
    render(<AchievementsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Clan Activity" }));
    await userEvent.type(screen.getByPlaceholderText(/Search drops, quests or players/), "quest");
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
