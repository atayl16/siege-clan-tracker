import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, it, expect } from "vitest";

let mockReset = null;
vi.mock("../hooks/useSiegeScoreReset", () => ({ useSiegeScoreReset: () => ({ resetAt: mockReset }) }));
const { default: Leaderboard } = await import("../components/Leaderboard");

const members = [{ wom_id: 1, name: "Test Player", siege_score: 150 }];

it("says since when the Siege Score standings count", () => {
  mockReset = "2026-10-26T13:00:00Z";
  render(<Leaderboard members={members} />);
  expect(screen.getByText(/Points since scores were last reset on/)).toBeInTheDocument();
});

it("says nothing about a reset when none is recorded", () => {
  mockReset = null;
  render(<Leaderboard members={members} />);
  expect(screen.queryByText(/last reset/)).toBeNull();
});
