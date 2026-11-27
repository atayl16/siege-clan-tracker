import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import SiteFooter from "../components/SiteFooter";
import AboutPage from "../pages/AboutPage";
import { xpWeekContaining } from "../utils/xpWeek";
import { formatWeekdayTime } from "../utils/dates";

describe("SiteFooter", () => {
  it("shows Jagex's notice in the policy's own words, and links to About and Privacy", () => {
    render(<MemoryRouter><SiteFooter /></MemoryRouter>);
    expect(
      screen.getByText(
        /Created using intellectual property belonging to Jagex Limited under the terms of Jagex's Fan Content Policy\. This content is not endorsed by or affiliated with Jagex\./
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/about#privacy");
  });
});

describe("AboutPage", () => {
  const renderAbout = () => render(<MemoryRouter><AboutPage /></MemoryRouter>);

  it("gives the week's turnover on the visitor's clock too, when it differs from the UK's", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // In UTC (as CI runs), July is an hour off UK summer time and December
      // matches it, so both cases are covered there.
      for (const now of ["2026-07-01T12:00:00Z", "2026-12-02T12:00:00Z"]) {
        vi.setSystemTime(new Date(now));
        const turnover = xpWeekContaining().end;
        const local = formatWeekdayTime(turnover);
        const differs = local !== formatWeekdayTime(turnover, { timeZone: "Europe/London" });

        const { unmount } = renderAbout();
        const item = screen.getByText(/runs from Monday 7pm UK time/);
        expect(item).toHaveTextContent(
          differs ? `UK time (${local} where you are). Weekly titles` : "UK time. Weekly titles"
        );
        unmount();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("covers how the site works, suggestions, stats, updates and privacy", () => {
    renderAbout();
    for (const heading of [
      "About the Site",
      "How the Site Works",
      "Suggestions Welcome",
      "Where Stats Come From",
      "How Often It Updates",
      "Privacy",
      "Stored About You",
      "Public and Private",
      "Changing or Deleting Your Data",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/Nothing is sold/)).toBeInTheDocument();
  });

  it("links to the Discord suggestions channel", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: "Share a Suggestion" })).toHaveAttribute(
      "href",
      "https://discord.com/channels/967354755045290004/968426819755868210"
    );
  });

  it("has a contents link for each section, pointing at a real heading", () => {
    const { container } = renderAbout();
    const links = screen.getByRole("navigation", { name: "On this page" }).querySelectorAll("a");
    expect(links.length).toBe(5);
    for (const a of links) {
      expect(container.querySelector(a.getAttribute("href"))).not.toBeNull();
    }
  });
});
