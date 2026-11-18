import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

let mockMembers = [];
vi.mock("../hooks/useMembers", () => ({ useMembers: () => ({ members: mockMembers, loading: false, error: null }) }));

import RankAlerts, { rankUpsDue } from "../components/RankAlerts";

const member = (over) => ({ wom_id: 1, name: "Test Fighter", womrole: "leader", ehb: 512, hidden: false, ...over });

describe("RankAlerts", () => {
  it("lists members due a rank-up, with the rank they earned", () => {
    mockMembers = [member(), member({ wom_id: 2, name: "Test Dropped", womrole: "supervisor", ehb: 480 })];
    render(<RankAlerts />);
    expect(screen.getByText("Test Fighter")).toBeInTheDocument();
    expect(screen.getByText("Supervisor")).toBeInTheDocument();
    expect(screen.queryByText("Test Dropped")).toBeNull();
    expect(screen.getByText(/Promote these members in game/)).toBeInTheDocument();
  });

  it("says so when nobody is due", () => {
    mockMembers = [member({ womrole: "supervisor", ehb: 480 })];
    render(<RankAlerts />);
    expect(screen.getByText("No rank-ups due")).toBeInTheDocument();
  });

  it("skips hidden and former members", () => {
    expect(rankUpsDue([member({ hidden: true }), member({ wom_id: 2, left_date: "2026-10-01" })])).toEqual([]);
  });
});
