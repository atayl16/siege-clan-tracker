import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";

let mockUser = null;
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

import UsingTheSite from "../components/UsingTheSite";

const renderSection = () =>
  render(
    <MemoryRouter>
      <UsingTheSite />
    </MemoryRouter>
  );

describe("UsingTheSite", () => {
  it("walks a visitor through signing up, claiming and tracking", () => {
    mockUser = null;
    renderSection();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps.map((s) => s.querySelector("h4").textContent)).toEqual([
      "Create an Account",
      "Claim Your Characters",
      "Track and Compete",
    ]);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /How points work/ })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByText(/your main and any alts/)).toBeInTheDocument();
  });

  it("sends a signed-in member to their profile and claim form instead", () => {
    mockUser = { id: "u1", username: "test_user" };
    renderSection();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
    expect(screen.getByRole("link", { name: /go to your profile/ })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Claim a character/ })).toHaveAttribute("href", "/profile?tab=requests");
  });
});
