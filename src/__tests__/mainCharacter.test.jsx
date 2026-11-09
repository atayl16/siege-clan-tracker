import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    user: { id: "u1", username: "roin", created_at: "2026-01-01T00:00:00Z" },
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
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Roinrin", false)];
    renderPage();
    const names = screen.getAllByText(/^(Oldalt|Roinrin)$/).map((el) => el.textContent);
    expect(names).toEqual(["Roinrin", "Oldalt"]);
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Alt")).toBeInTheDocument();
  });

  it("Make Main calls set_main_character and reloads the claims", async () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Roinrin", false)];
    renderPage();
    const buttons = screen.getAllByRole("button", { name: "Make Main" });
    expect(buttons).toHaveLength(1); // only on the alt
    const callsBefore = fetchUserClaims.mock.calls.length;
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(fetchUserClaims.mock.calls.length).toBe(callsBefore + 1));
    expect(fetchUserClaims).toHaveBeenLastCalledWith("u1");
    expect(supabase.rpc).toHaveBeenCalledWith("set_main_character", { p_wom_id: 1 });
  });

  it("shows the error when the change is refused", async () => {
    mockClaims = [claim(1, "Oldalt", true), claim(2, "Roinrin", false)];
    supabase.rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "You have not claimed this character" } });
    renderPage();
    // The page loads claims on mount; a refused change must not reload them.
    const callsBefore = fetchUserClaims.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Make Main" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You have not claimed this character");
    expect(fetchUserClaims).toHaveBeenCalledTimes(callsBefore);
  });

  it("shows no main/alt controls with a single character", () => {
    mockClaims = [claim(2, "Roinrin", true)];
    renderPage();
    expect(screen.getByText("Claimed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Make Main" })).toBeNull();
  });
});
