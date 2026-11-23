import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

let mockFeed = { activities: [], loading: false, error: null };
vi.mock("../hooks/useRuneProfile", () => ({ useClanActivity: () => mockFeed }));
import ClanActivityFeed from "../components/ClanActivityFeed";

const act = (i) => ({ type: "quest_completed", enriched: { questName: `Test Quest ${i}` }, createdAt: "2026-11-23 10:00:00", username: `Test Player ${i}` });

describe("ClanActivityFeed", () => {
  it("shows nothing when there is nothing to show, or RuneProfile is down", () => {
    mockFeed = { activities: [], loading: false, error: new Error("502") };
    const { container } = render(<ClanActivityFeed />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the newest six, with who did what, and more on request", async () => {
    mockFeed = { activities: Array.from({ length: 20 }, (_, i) => act(i)), loading: false, error: null };
    render(<ClanActivityFeed />);
    expect(screen.getByRole("heading", { name: /Latest From the Clan/ })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Test Player 0 Completed Test Quest 0");
    await userEvent.click(screen.getByRole("button", { name: "Show More" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
  });

  it("credits RuneProfile and says how to add your own", () => {
    mockFeed = { activities: [act(1)], loading: false, error: null };
    render(<ClanActivityFeed />);
    expect(screen.getByRole("link", { name: "RuneProfile" })).toHaveAttribute("href", "https://www.runeprofile.com/clan/Siege");
    expect(screen.getByRole("link", { name: "Add yours" })).toHaveAttribute("href", "https://www.runeprofile.com/info/guide");
    expect(screen.queryByRole("button", { name: "Show More" })).toBeNull();
  });
});
