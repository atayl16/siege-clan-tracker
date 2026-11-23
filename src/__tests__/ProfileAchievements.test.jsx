import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePlayer } from "./achievementsFixture";

const usePlayer = vi.fn();
vi.mock("../hooks/usePlayer", () => ({ usePlayer: (...args) => usePlayer(...args) }));

import ProfileAchievements, { ago } from "../components/ProfileAchievements";

const characters = [
  { womId: 1, name: "Test Main", isMain: true },
  { womId: 2, name: "Test Alt", isMain: false },
];

beforeEach(() => {
  usePlayer.mockReset().mockImplementation((id) => ({
    player: makePlayer({ levels: { magic: id === 1 ? 98 : 60 }, xp: { magic: id === 1 ? 12_900_000 : 300_000 }, bosses: { vorkath: 120 } }),
    loading: false,
    error: null,
  }));
});

describe("ProfileAchievements", () => {
  it("loads the main first, once, with no background refresh", () => {
    render(<ProfileAchievements characters={characters} />);
    expect(usePlayer).toHaveBeenLastCalledWith(1, expect.objectContaining({ refreshInterval: 0 }));
    expect(screen.getByText(/milestones reached/)).toBeInTheDocument();
    // 23 skills at 50 and Magic 98 is 1248 total, 2 levels short of 1250.
    expect(screen.getByText("1250 total level")).toBeInTheDocument();
  });

  it("switches character", async () => {
    render(<ProfileAchievements characters={characters} />);
    await userEvent.click(screen.getByRole("button", { name: "Test Alt" }));
    expect(usePlayer).toHaveBeenLastCalledWith(2, expect.anything());
    expect(screen.getByRole("button", { name: "Test Alt" })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to the main, and loads it, if the picked character is no longer claimed", async () => {
    const { rerender } = render(<ProfileAchievements characters={characters} />);
    await userEvent.click(screen.getByRole("button", { name: "Test Alt" }));
    rerender(<ProfileAchievements characters={[characters[0]]} />);
    expect(usePlayer).toHaveBeenLastCalledWith(1, expect.anything());
    expect(screen.getByRole("heading", { name: "Test Main" })).toBeInTheDocument();
  });

  it("hides the character picker for a single character", () => {
    render(<ProfileAchievements characters={[characters[0]]} />);
    expect(screen.queryByRole("group", { name: "Character" })).toBeNull();
  });

  it("orders skills nearest-first, or in skill order", async () => {
    render(<ProfileAchievements characters={characters} />);
    const skills = () =>
      within(screen.getByRole("region", { name: "Skills" }))
        .getAllByRole("img", { name: /milestones reached/ })
        .map((el) => el.getAttribute("aria-label").split(":")[0]);
    expect(skills()[0]).toBe("Magic");
    await userEvent.click(screen.getByRole("button", { name: "Skill order" }));
    expect(skills()[0]).toBe("Attack");
  });

  it("shows only bosses with kills", () => {
    render(<ProfileAchievements characters={characters} />);
    const bosses = within(screen.getByRole("region", { name: /Bosses/ }));
    expect(bosses.getByText("Vorkath")).toBeInTheDocument();
    expect(bosses.getAllByRole("img", { name: /milestones reached/ })).toHaveLength(1);
  });

  it("says so when Wise Old Man cannot be reached", () => {
    usePlayer.mockReturnValue({ player: undefined, loading: false, error: new Error("502") });
    render(<ProfileAchievements characters={characters} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load Test Main's stats");
  });
});

describe("ago", () => {
  it("reads as minutes, hours or days", () => {
    const now = Date.parse("2026-11-23T12:00:00Z");
    expect(ago("2026-11-23T11:43:00Z", now)).toBe("17 minutes ago");
    expect(ago("2026-11-23T09:00:00Z", now)).toBe("3 hours ago");
    expect(ago("2026-11-20T12:00:00Z", now)).toBe("3 days ago");
  });
});
