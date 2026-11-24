import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, it, expect } from "vitest";

let rows = [];
vi.mock("swr", () => ({ default: () => ({ data: rows, error: null }) }));
vi.mock("../supabaseClient", () => ({ supabase: {} }));

const { default: EventStampCard, lastWeeks } = await import("../components/EventStampCard");

it("marks a week with a competition with a star, and leaves the others empty", () => {
  const thisWeek = lastWeeks().at(-1);
  rows = [{ events: { name: "Siege SotW - Test Skill", start_date: thisWeek.start.toISOString(), end_date: thisWeek.end.toISOString() } }];

  const { container } = render(
    <MemoryRouter>
      <EventStampCard womIds={[1]} />
    </MemoryRouter>
  );

  const stamps = container.querySelectorAll(".esc-stamp");
  expect(stamps).toHaveLength(12);
  expect(stamps[11].querySelector(".esc-star")).not.toBeNull();
  expect(stamps[0].querySelector(".esc-star")).toBeNull();
  expect(screen.getByText("1/12 weeks")).toBeInTheDocument();
});
