import { describe, it, expect } from "vitest";
import { formatNumber } from "../numbers";

describe("formatNumber", () => {
  it("puts commas between the thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber("9876")).toBe("9,876");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-1500)).toBe("-1,500");
    expect(formatNumber(12.5)).toBe("12.5");
  });

  it("is empty for a missing value or one that is not a number", () => {
    expect(formatNumber(null)).toBe("");
    expect(formatNumber(undefined)).toBe("");
    expect(formatNumber("")).toBe("");
    expect(formatNumber("abc")).toBe("");
  });
});
