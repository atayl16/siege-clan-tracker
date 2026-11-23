import { describe, it, expect } from "vitest";
import { formatDate } from "../dates";

describe("formatDate", () => {
  it("writes the month as a word, in the browser's own order", () => {
    const text = formatDate("2026-11-09T12:00:00Z");
    expect(text).toMatch(/Nov/);
    expect(text).toMatch(/2026/);
    expect(text).not.toMatch(/^\d+\/\d+\/\d+$/);
  });

  it("is empty for a missing or broken date", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});
