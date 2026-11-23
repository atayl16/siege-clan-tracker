import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../components/goals/GoalProgress", () => ({ default: () => null }));
import PlayerGoalSummary from "../components/goals/PlayerGoalSummary";

const goal = (id, completed) => ({ id, metric: "attack", goal_type: "level", completed });

describe("PlayerGoalSummary", () => {
  it("shows nothing when the character has no goals, or only finished ones", () => {
    const { container, rerender } = render(<PlayerGoalSummary goals={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PlayerGoalSummary goals={[goal(1, true)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists up to three goals still in progress", () => {
    render(<PlayerGoalSummary goals={[1, 2, 3, 4].map((i) => goal(i, false))} />);
    expect(screen.getByText("Current Goals")).toBeInTheDocument();
    expect(screen.getAllByText("Attack")).toHaveLength(3);
  });
});
