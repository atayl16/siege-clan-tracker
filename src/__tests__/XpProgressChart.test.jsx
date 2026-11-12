import { render, screen, fireEvent, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import XpProgressChart, { layoutPoints } from "../components/XpProgressChart";

const points = [
  { date: "2026-10-13T12:00:00.000Z", value: 539_473_418 },
  { date: "2026-10-28T12:00:00.000Z", value: 540_000_000 },
  { date: "2026-11-12T12:00:00.000Z", value: 542_285_906 },
];

const renderChart = (props = { womId: 323559 }) =>
  render(
    // A fresh cache per test, so one test's response is not another's.
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <XpProgressChart {...props} />
    </SWRConfig>
  );

describe("layoutPoints", () => {
  it("spreads points across the width by time and puts the lowest at the bottom", () => {
    const laid = layoutPoints(points);
    expect(laid[0].x).toBe(0);
    expect(laid[2].x).toBe(300);
    expect(laid[1].x).toBeCloseTo(150, 0);
    expect(laid[0].y).toBeGreaterThan(laid[2].y);
  });

  it("draws a period with no XP gained as a flat line", () => {
    const laid = layoutPoints([
      { date: "2026-11-01T00:00:00Z", value: 5 },
      { date: "2026-11-02T00:00:00Z", value: 5 },
    ]);
    expect(laid[0].y).toBe(laid[1].y);
  });
});

describe("XpProgressChart", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      const period = new URL(url, "http://x").searchParams.get("period");
      return new Response(JSON.stringify({ period, points }), { status: 200 });
    });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("shows the XP gained over the past month by default", async () => {
    renderChart();
    expect(await screen.findByText("+2.81M XP")).toBeInTheDocument();
    expect(screen.getByText(/in the past month · 542.29M total/)).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/wom-player-timeline?id=323559&period=month");
  });

  it("switches period", async () => {
    renderChart();
    await screen.findByText("+2.81M XP");
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    expect(await screen.findByText(/in the past year · 542.29M total/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year" })).toHaveAttribute("aria-pressed", "true");
    expect(globalThis.fetch).toHaveBeenLastCalledWith("/api/wom-player-timeline?id=323559&period=year");
  });

  it("reads each snapshot with the arrow keys", async () => {
    renderChart();
    const chart = await screen.findByRole("img");
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(within(screen.getByRole("status")).getByText("539,473,418 XP")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(within(screen.getByRole("status")).getByText("540,000,000 XP")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "Escape" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("describes the chart for screen readers", async () => {
    renderChart();
    const chart = await screen.findByRole("img");
    expect(chart).toHaveAccessibleName(/Total XP in the past month: from 539.47M .* to 542.29M .* a gain of 2.81M/);
  });

  it("says when there is not enough data", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ points: [points[0]] })));
    renderChart();
    expect(await screen.findByText(/Not enough Wise Old Man data/)).toBeInTheDocument();
  });

  it("says when WOM cannot be reached", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "x" }), { status: 502 }));
    renderChart();
    expect(await screen.findByText(/Couldn't load XP history/)).toBeInTheDocument();
  });
});
