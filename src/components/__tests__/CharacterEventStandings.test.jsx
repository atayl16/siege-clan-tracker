import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../hooks/usePlayerEvents", () => ({ usePlayerEvents: vi.fn() }));

import { usePlayerEvents } from "../../hooks/usePlayerEvents";
import CharacterEventStandings, {
  ordinal,
  timeLeft,
} from "../CharacterEventStandings";

const event = (overrides = {}) => ({
  competitionId: 1,
  title: "Skill of the Week",
  metric: "runecrafting",
  endsAt: new Date(Date.now() + 3 * 86400000 + 60000).toISOString(),
  rank: 3,
  participantCount: 42,
  gained: 123456,
  ...overrides,
});

describe("CharacterEventStandings", () => {
  beforeEach(() => vi.mocked(usePlayerEvents).mockReset());

  it("shows placement, metric, gain and time left for each running event", () => {
    vi.mocked(usePlayerEvents).mockReturnValue({ events: [event()], loading: false });
    render(<CharacterEventStandings womId={1234} />);

    expect(usePlayerEvents).toHaveBeenCalledWith(1234);
    expect(screen.getByText("Current Events")).toBeInTheDocument();
    expect(screen.getByText("Skill of the Week")).toBeInTheDocument();
    expect(screen.getByText("3rd of 42")).toBeInTheDocument();
    expect(screen.getByText(/Runecrafting \+123,456/)).toBeInTheDocument();
    expect(screen.getByText("ends in 3d")).toBeInTheDocument();
  });

  it("marks first place", () => {
    vi.mocked(usePlayerEvents).mockReturnValue({
      events: [event({ rank: 1 })],
      loading: false,
    });
    render(<CharacterEventStandings womId={1234} />);
    expect(screen.getByLabelText("Leading")).toBeInTheDocument();
  });

  it.each([
    ["no running events", { events: [], loading: false }],
    ["still loading", { events: [], loading: true }],
    ["WOM failing", { events: [], loading: false, error: new Error("503") }],
  ])("renders nothing with %s", (_label, state) => {
    vi.mocked(usePlayerEvents).mockReturnValue(state);
    const { container } = render(<CharacterEventStandings womId={1234} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"],
    [11, "11th"], [12, "12th"], [13, "13th"],
    [21, "21st"], [22, "22nd"], [101, "101st"], [111, "111th"],
  ])("%i -> %s", (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe("timeLeft", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  it.each([
    ["2026-11-09T11:00:00Z", "ending now"],
    ["2026-11-09T12:30:00Z", "ends in under an hour"],
    ["2026-11-10T09:00:00Z", "ends in 21h"],
    ["2026-11-14T12:00:00Z", "ends in 5d"],
  ])("%s -> %s", (endsAt, expected) => {
    expect(timeLeft(endsAt, now)).toBe(expected);
  });
});
