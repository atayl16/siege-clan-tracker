import { describe, it, expect } from "vitest";
import { titleStanding, standingOrder } from "../titleStanding";

const title = { id: "warrior", minimum: 5 };
const rows = [
  { womId: 1, value: 20 },
  { womId: 2, value: 15 },
  { womId: 3, value: 12 },
  { womId: 4, value: 9 },
  { womId: 5, value: 3 }, // below the minimum
];

describe("titleStanding", () => {
  it("places the top 3 with their points", () => {
    expect(titleStanding(title, rows, 2)).toEqual({ kind: "placing", place: 2, of: 4, points: 100, value: 15 });
  });

  it("says how far behind 3rd the rest are", () => {
    expect(titleStanding(title, rows, 4)).toEqual({ kind: "chasing", place: 4, of: 4, behind: 3, value: 9 });
  });

  it("says how much more a character below the minimum needs to enter", () => {
    expect(titleStanding(title, rows, 5)).toEqual({ kind: "entering", short: 2, value: 3 });
  });

  it("is nothing for a race the character has no progress in", () => {
    expect(titleStanding(title, rows, 9)).toBeNull();
    expect(titleStanding(title, [...rows, { womId: 9, value: 0 }], 9)).toBeNull();
  });

  it("shares a place on a tie", () => {
    const tied = [{ womId: 1, value: 10 }, { womId: 2, value: 10 }, { womId: 3, value: 8 }];
    expect(titleStanding(title, tied, 2)).toMatchObject({ kind: "placing", place: 1, points: 150 });
  });

  it("orders placing first, then nearest to its target", () => {
    const placing = { kind: "placing", place: 3 };
    const near = { kind: "chasing", value: 9, behind: 1 };
    const far = { kind: "entering", value: 1, short: 9 };
    expect([far, near, placing].sort((a, b) => standingOrder(a) - standingOrder(b))).toEqual([placing, near, far]);
  });
});
