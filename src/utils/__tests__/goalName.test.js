import { describe, it, expect } from "vitest";
import { goalName } from "../goalName";

describe("goalName", () => {
  it("reads skills and bosses as names", () => {
    expect(goalName({ metric: "attack", goal_type: "skill" })).toBe("Attack");
    expect(goalName({ metric: "kreearra", goal_type: "boss" })).toBe("Kree'Arra");
    expect(goalName({ metric: "chambers_of_xeric", goal_type: "boss" })).toBe("Chambers of Xeric");
  });
});
