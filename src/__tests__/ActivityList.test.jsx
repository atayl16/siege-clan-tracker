import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActivityList from "../components/ActivityList";

describe("ActivityList", () => {
  it("still lists an activity whose timestamp does not parse, just without a time", () => {
    render(
      <ActivityList
        activities={[
          { type: "quest_completed", enriched: { questName: "Test Quest" }, createdAt: "garbage" },
          { type: "quest_completed", enriched: { questName: "Other Quest" }, createdAt: "2026-11-23 10:00:00" },
        ]}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(/Completed Test Quest/)).toBeInTheDocument();
  });
});
