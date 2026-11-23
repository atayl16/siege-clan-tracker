import React from "react";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { mainCharacterId, mainFirst } from "../utils/characters";

const claim = (wom_id, name, alt) => ({
  user_id: "u1",
  wom_id,
  claimed_at: "2026-01-01T00:00:00Z",
  members: { wom_id, name, alt, current_lvl: 100, ehb: 0, siege_score: 0 },
});

describe("mainCharacterId / mainFirst", () => {
  it("is the character not marked alt", () => {
    const claims = [claim(1, "Alt", true), claim(2, "Main", false)];
    expect(mainCharacterId(claims)).toBe(2);
    expect(mainFirst(claims).map((c) => c.wom_id)).toEqual([2, 1]);
  });

  it("falls back to the first claim when all are alts or the flag is missing", () => {
    expect(mainCharacterId([claim(1, "A", true), claim(2, "B", true)])).toBe(1);
    expect(mainCharacterId([claim(3, "C", undefined)])).toBe(3);
  });

  it("handles no claims", () => {
    expect(mainCharacterId(undefined)).toBeNull();
    expect(mainFirst(null)).toEqual([]);
  });
});

// ProfilePage with two claimed characters.
const fetchUserClaims = vi.fn();
let mockClaims = [];
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "moon", created_at: "2026-01-01T00:00:00Z" },
    userClaims: mockClaims,
    fetchUserClaims,
  }),
}));
vi.mock("../hooks/useRaces", () => ({
  useRaces: () => ({ races: [], loading: false, refresh: vi.fn() }),
}));
vi.mock("../services/goalProgressService", () => ({
  updatePlayerGoals: vi.fn().mockResolvedValue(),
}));
vi.mock("../components/goals/PlayerGoalSummary", () => ({ default: () => null }));
vi.mock("../components/goals/GoalsList", () => ({ default: () => null }));
vi.mock("../components/ClaimPlayer", () => ({ default: () => null }));
let mockGoals = [];
const useUserGoals = vi.fn(() => ({ userGoals: mockGoals }));
vi.mock("../hooks/useUserGoals", () => ({ useUserGoals: (...args) => useUserGoals(...args) }));
vi.mock("../components/YourTitleRaces", () => ({ default: () => <section data-testid="title-races" /> }));
vi.mock("../components/WeeklyXpLeaderboard", () => ({
  default: (props) => <div data-testid="xp-week" className={props.className} />,
  YourWeeklyXp: () => null,
}));
const achievementsMounts = vi.fn();
vi.mock("../components/ProfileAchievements", () => ({
  default: (props) => {
    achievementsMounts(props);
    return null;
  },
}));

import { supabase } from "../supabaseClient";
import ProfilePage from "../pages/ProfilePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

describe("ProfilePage main character", () => {
  beforeEach(() => {
    fetchUserClaims.mockReset().mockResolvedValue();
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  });

  it("lists the main first and labels main and alt", () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    renderPage();
    // The picker lists the main first; the main's card shows by default.
    const picker = within(screen.getByRole("group", { name: "Character" }));
    expect(picker.getAllByRole("button").map((b) => b.textContent)).toEqual(["WrenfieldMain", "Oldalt"]);
    expect(picker.getByRole("button", { name: /Wrenfield/ })).toHaveAttribute("aria-pressed", "true");
    // current_lvl is the total level; it was labelled "Combat Level".
    expect(screen.getAllByText("Total Level").length).toBeGreaterThan(0);
    expect(screen.queryByText("Combat Level")).toBeNull();
    fireEvent.click(picker.getByRole("button", { name: "Oldalt" }));
    expect(screen.getByText("Alt")).toBeInTheDocument();
  });

  it("shows one character's card at a time", () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    const { container } = renderPage();
    expect(container.querySelectorAll(".ui-character-card")).toHaveLength(1);
    expect(container.querySelector(".ui-character-name")).toHaveTextContent("Wrenfield");
  });

  it("Make Main calls set_main_character and reloads the claims", async () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    renderPage();
    fireEvent.click(within(screen.getByRole("group", { name: "Character" })).getByRole("button", { name: "Oldalt" }));
    const buttons = screen.getAllByRole("button", { name: "Make Main" });
    expect(buttons).toHaveLength(1); // only on the alt
    const callsBefore = fetchUserClaims.mock.calls.length;
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(fetchUserClaims.mock.calls.length).toBe(callsBefore + 1));
    expect(fetchUserClaims).toHaveBeenLastCalledWith("u1");
    expect(supabase.rpc).toHaveBeenCalledWith("set_main_character", { p_wom_id: 1 });
  });

  it("shows the error when the change is refused", async () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    supabase.rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "You have not claimed this character" } });
    renderPage();
    // The page loads claims on mount; a refused change must not reload them.
    const callsBefore = fetchUserClaims.mock.calls.length;
    fireEvent.click(within(screen.getByRole("group", { name: "Character" })).getByRole("button", { name: "Oldalt" }));
    fireEvent.click(screen.getByRole("button", { name: "Make Main" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You have not claimed this character");
    expect(fetchUserClaims).toHaveBeenCalledTimes(callsBefore);
  });

  it("labels a single character Main, with no Make Main button", () => {
    // It used to say "Claimed", which every character on this page is.
    mockClaims = [claim(2, "Wrenfield", true)];
    renderPage();
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.queryByText("Claimed")).toBeNull();
    expect(screen.queryByRole("button", { name: "Make Main" })).toBeNull();
  });

  it("tells someone with one character they can claim their alts too", () => {
    mockClaims = [claim(2, "Wrenfield", false)];
    renderPage();
    expect(screen.getByText(/Have more than one account\?/)).toBeInTheDocument();
  });

  it("does not repeat that once they have more than one", () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    renderPage();
    expect(screen.queryByText(/Have more than one account\?/)).toBeNull();
  });

  it("explains claiming, and opens the claim form, when nothing is claimed", () => {
    mockClaims = [];
    renderPage();
    expect(screen.getByText("Claim Your Characters")).toBeInTheDocument();
    expect(screen.getByText(/Have alts\? Claim each one/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Claim a Character" }));
    expect(screen.getByRole("heading", { name: "Character Claims" })).toBeInTheDocument();
  });

  it("loads achievements only when that tab is opened, main first", () => {
    achievementsMounts.mockClear();
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    renderPage();
    expect(achievementsMounts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Achievements/ }));
    expect(achievementsMounts).toHaveBeenCalled();
    expect(achievementsMounts.mock.calls.at(-1)[0].characters).toEqual([
      { womId: 2, name: "Wrenfield", isMain: true },
      { womId: 1, name: "Oldalt", isMain: false },
    ]);
  });

  it("offers to set a goal when a character has none, and to manage them when it has some", () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    mockGoals = [{ id: 9, user_id: "u1", wom_id: 2, completed: false, metric: "attack", goal_type: "level" }];
    useUserGoals.mockClear();
    renderPage();
    expect(screen.getByRole("button", { name: "Manage Goals" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("group", { name: "Character" })).getByRole("button", { name: "Oldalt" }));
    expect(screen.getByRole("button", { name: "Set a Goal" })).toBeInTheDocument();
    // One goals query for the whole page, not one per character card.
    expect(new Set(useUserGoals.mock.calls.map((c) => c[0]))).toEqual(new Set(["u1"]));
    mockGoals = [];
  });

  it("updates goal progress once per 10 minutes, only for characters with goals in progress", async () => {
    const { updatePlayerGoals } = await import("../services/goalProgressService");
    updatePlayerGoals.mockClear();
    localStorage.clear();
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Wrenfield", false)];
    mockGoals = [
      { id: 9, user_id: "u1", wom_id: 2, completed: false, metric: "attack", goal_type: "skill" },
      { id: 8, user_id: "u1", wom_id: 1, completed: true, metric: "attack", goal_type: "skill" },
    ];
    renderPage();
    await waitFor(() => expect(updatePlayerGoals).toHaveBeenCalledTimes(1));
    expect(updatePlayerGoals).toHaveBeenCalledWith(2, "u1", { goals: mockGoals });

    // Coming back within 10 minutes does not run it again.
    cleanup();
    renderPage();
    await new Promise((r) => setTimeout(r, 0));
    expect(updatePlayerGoals).toHaveBeenCalledTimes(1);
    mockGoals = [];
  });

  const screenWidth = (wide) => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: wide,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  };

  it("on a wide screen, puts top XP and your title races in the side panel, not the header", () => {
    screenWidth(true);
    mockClaims = [claim(2, "Wrenfield", false)];
    const { container } = renderPage();
    expect(container.querySelector(".profile-sidebar [data-testid=xp-week]")).not.toBeNull();
    expect(container.querySelector(".profile-sidebar [data-testid=title-races]")).not.toBeNull();
    expect(container.querySelector(".profile-header [data-testid=xp-week]")).toBeNull();
    delete window.matchMedia;
  });

  it("leaves the side panel out entirely on a narrow screen", () => {
    screenWidth(false);
    mockClaims = [claim(2, "Wrenfield", false)];
    const { container } = renderPage();
    expect(container.querySelector(".profile-sidebar")).toBeNull();
    delete window.matchMedia;
  });

  it("opens the tab a link names", () => {
    mockClaims = [claim(2, "Wrenfield", false)];
    render(
      <MemoryRouter initialEntries={["/profile?tab=requests"]}>
        <ProfilePage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Character Claims" })).toBeInTheDocument();
  });
});
