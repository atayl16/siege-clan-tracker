import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
  },
}));

import UsageAlerts from "../components/UsageAlerts";

const today = new Date().toISOString();

function snapshot(over = {}) {
  return {
    used: 40,
    usage_limit: 300,
    unit: "minutes",
    period_start: "2026-11-01",
    period_end: "2026-12-01",
    projected: 120,
    level: "ok",
    checked_at: today,
    used_text: "40 minutes",
    limit_text: "300 minutes",
    projected_text: "120 minutes",
    ...over,
  };
}

function metric(over = {}) {
  return {
    metric: "netlify_build_minutes",
    label: "Netlify Build Minutes",
    kind: "cumulative",
    provider: "Netlify",
    dashboard: "https://app.netlify.com",
    dashboardPage: "Usage & Billing",
    snapshot: snapshot(),
    ...over,
  };
}

function answer(metrics) {
  globalThis.fetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: { metrics, unreadable: ["Supabase egress"] } }), { status: 200 }),
  );
}

describe("UsageAlerts", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("asks the admin function with the session token", async () => {
    answer([metric()]);
    render(<UsageAlerts />);
    await screen.findByText("Netlify Build Minutes");
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("/.netlify/functions/admin-usage");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("shows the figures, the projection and an all-clear when every limit is fine", async () => {
    answer([metric()]);
    render(<UsageAlerts />);
    expect(await screen.findByText(/well inside the free tiers/)).toBeInTheDocument();
    expect(screen.getByText("40 minutes")).toBeInTheDocument();
    expect(screen.getByText(/On course for 120 minutes \(40%\) by 2026-12-01/)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Netlify Build Minutes used" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("Supabase egress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Netlify Usage & Billing" })).toHaveAttribute("href", "https://app.netlify.com");
  });

  it("labels a limit that is close and drops the all-clear", async () => {
    answer([metric({ snapshot: snapshot({ used: 250, used_text: "250 minutes", projected: null, projected_text: null, level: "problem" }) })]);
    render(<UsageAlerts />);
    expect(await screen.findByText("Near Limit")).toBeInTheDocument();
    expect(screen.getByText("Too early in the period to project")).toBeInTheDocument();
    expect(screen.queryByText(/well inside the free tiers/)).not.toBeInTheDocument();
  });

  it("says when a metric has no reading yet, or the last one is old", async () => {
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    answer([
      metric({ metric: "netlify_bandwidth", label: "Netlify Bandwidth", snapshot: null }),
      metric({ snapshot: snapshot({ checked_at: old }) }),
    ]);
    render(<UsageAlerts />);
    expect(await screen.findByText("No Reading")).toBeInTheDocument();
    expect(screen.getByText(/Last reading 5 days ago/)).toBeInTheDocument();
  });

  it("shows the server's error", async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 }));
    render(<UsageAlerts />);
    expect(await screen.findByText("Forbidden: Admin access required")).toBeInTheDocument();
  });
});
