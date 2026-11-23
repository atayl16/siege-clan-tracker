import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Each tab's content is a stand-in that records being mounted, so the tests
// can check that only the open tab loads.
const mounted = [];
const stub = (name) => ({ default: () => (mounted.push(name), <div>{name} content</div>) });
vi.mock("../components/events/Competitions", () => stub("Competitions"));
vi.mock("../components/events/RacesBoard", () => stub("Races"));
vi.mock("../components/events/GoalsBoard", () => stub("Goals"));
vi.mock("../components/ClanStats", () => stub("ClanStats"));
vi.mock("../components/HallOfFame", () => stub("HallOfFame"));
vi.mock("../hooks/useMembers", () => ({
  useMembers: () => (mounted.push("MembersList"), { members: [{ id: 1, name: "Test Member" }], loading: false }),
}));
vi.mock("../hooks/useEvents", () => ({ useEvents: () => (mounted.push("useEvents"), { events: [], loading: false }) }));
vi.mock("../components/Leaderboard", () => ({ default: () => null }));
vi.mock("../components/WeeklyXpLeaderboard", () => ({ default: () => null }));
vi.mock("../components/WeeklyTitles", () => ({ TitleHolders: () => null, TitleRaces: () => null }));
vi.mock("../components/MemberTable", () => ({ default: () => null }));

const { default: EventsPage } = await import("../pages/EventsPage");
const { default: MembersPage } = await import("../pages/MembersPage");
const { default: LeaderboardPage } = await import("../pages/LeaderboardPage");
const { default: ScrollToTop } = await import("../components/ScrollToTop");

function ShowUrl() {
  const { pathname, search } = useLocation();
  return <output data-testid="url">{pathname + search}</output>;
}

const renderAt = (url, page) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      {page}
      <ShowUrl />
    </MemoryRouter>
  );

beforeEach(() => {
  mounted.length = 0;
});

describe("Events tabs", () => {
  it("opens on Competitions with a clean URL, and loads no other tab", () => {
    renderAt("/events", <EventsPage />);
    expect(screen.getByRole("heading", { name: "Clan Events" })).toBeInTheDocument();
    expect(screen.getByText("Competitions content")).toBeInTheDocument();
    expect(mounted).toEqual(["Competitions"]);
  });

  it("opens the tab named in ?tab=, as the old Races & Goals links do", () => {
    renderAt("/events?tab=races", <EventsPage />);
    expect(screen.getByText("Races content")).toBeInTheDocument();
    expect(mounted).not.toContain("Competitions");
  });

  it("puts the open tab in the URL, and drops it again for the first tab", async () => {
    renderAt("/events", <EventsPage />);
    await userEvent.click(screen.getByRole("button", { name: /Goals/ }));
    expect(screen.getByText("Goals content")).toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/events?tab=goals");
    await userEvent.click(screen.getByRole("button", { name: /Competitions/ }));
    expect(screen.getByTestId("url").textContent).toBe("/events");
  });

  it("falls back to the first tab for an unknown ?tab=", () => {
    renderAt("/events?tab=nope", <EventsPage />);
    expect(screen.getByText("Competitions content")).toBeInTheDocument();
  });
});

describe("Members tabs", () => {
  it("opens on the member list, as before", () => {
    renderAt("/members", <MembersPage />);
    expect(screen.getByRole("heading", { name: "Clan Members" })).toBeInTheDocument();
    expect(mounted).toContain("MembersList");
    expect(mounted).not.toContain("ClanStats");
  });

  it("loads only the stats on the Clan Stats tab, not the member list", () => {
    renderAt("/members?tab=stats", <MembersPage />);
    expect(screen.getByText("ClanStats content")).toBeInTheDocument();
    expect(mounted).not.toContain("MembersList");
  });
});

describe("Leaderboard tabs", () => {
  it("still opens on This Week, with Hall of Fame as a tab that loads when opened", async () => {
    renderAt("/leaderboard", <LeaderboardPage />);
    expect(screen.getByRole("button", { name: /This Week/ })).toHaveClass("ui-tab-active");
    expect(mounted).not.toContain("HallOfFame");
    await userEvent.click(screen.getByRole("button", { name: /Hall of Fame/ }));
    expect(screen.getByText("HallOfFame content")).toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("/leaderboard?tab=hall-of-fame");
  });
});

describe("Siege Score tab", () => {
  it("is named for what it shows (scores reset every few months), with no Event Wins list", async () => {
    renderAt("/leaderboard?tab=score", <LeaderboardPage />);
    expect(screen.getByRole("button", { name: /Siege Score/ })).toHaveClass("ui-tab-active");
    expect(screen.queryByRole("button", { name: /All-time/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Event Wins/)).not.toBeInTheDocument();
    // The events table was loaded only for Event Wins.
    expect(mounted).not.toContain("useEvents");
  });
});

describe("ScrollToTop", () => {
  const renderNav = () =>
    render(
      <MemoryRouter initialEntries={["/members"]}>
        <ScrollToTop />
        <Link to="/about">About</Link>
        <Link to="/about#privacy">Privacy</Link>
        <Link to="/members?tab=stats">Stats tab</Link>
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    );

  it("starts a new page at the top", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNav();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("link", { name: "About" }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });

  it("leaves links to a section, and tab changes on the same page, alone", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNav();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("link", { name: "Privacy" }));
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it("does not scroll when only ?tab= changes", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNav();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("link", { name: "Stats tab" }));
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });
});
