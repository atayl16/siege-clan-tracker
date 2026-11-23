import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

let eventsState;
vi.mock("../hooks/useEvents", () => ({ useEvents: () => eventsState }));
vi.mock("../components/EventsTable", () => ({ default: () => <div>events table</div> }));

const { default: Tabs } = await import("../components/ui/Tabs");
const { default: Competitions } = await import("../components/events/Competitions");

const day = 24 * 60 * 60 * 1000;
const at = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();

describe("Tabs heading", () => {
  const renderTabs = (props) =>
    render(
      <Tabs activeTab="a" onChange={() => {}} {...props}>
        <Tabs.Tab tabId="a" label="First">first content</Tabs.Tab>
        <Tabs.Tab tabId="b" label="Second">second content</Tabs.Tab>
      </Tabs>
    );

  it("puts the page title on the tab row", () => {
    const { container } = renderTabs({ heading: "Clan Things" });
    const header = container.querySelector(".ui-tabs-header");
    expect(within(header).getByRole("heading", { name: "Clan Things" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "First" })).toBeInTheDocument();
    expect(screen.getByText("first content")).toBeInTheDocument();
  });

  it("renders just the tabs without a heading", () => {
    const { container } = renderTabs();
    expect(container.querySelector(".ui-tabs-header")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "Second" })).toBeInTheDocument();
  });
});

describe("Competitions summary", () => {
  beforeEach(() => {
    eventsState = { events: [], loading: false, error: null, refreshEvents: () => {} };
  });

  it("counts active and completed events on one line, leaving out none upcoming", () => {
    eventsState.events = [
      { id: 1, name: "Now", start_date: at(-2), end_date: at(2) },
      { id: 2, name: "Done", start_date: at(-20), end_date: at(-13) },
      { id: 3, name: "Done too", start_date: at(-10), end_date: at(-3) },
    ];
    render(<Competitions />);
    expect(screen.getByText("1 active · 2 completed")).toBeInTheDocument();
  });

  it("names upcoming events when there are some", () => {
    eventsState.events = [
      { id: 1, name: "Soon", start_date: at(2), end_date: at(9) },
      { id: 2, name: "Done", start_date: at(-20), end_date: at(-13) },
    ];
    render(<Competitions />);
    expect(screen.getByText("0 active · 1 upcoming · 1 completed")).toBeInTheDocument();
  });

  it("shows no counts while loading", () => {
    eventsState.loading = true;
    const { container } = render(<Competitions />);
    expect(container.querySelector(".events-summary")).toBeNull();
  });

  it("puts About Our Events after the list of events", () => {
    render(<Competitions />);
    const table = screen.getByText("events table");
    const about = screen.getByRole("heading", { name: "About Our Events" });
    expect(table.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
