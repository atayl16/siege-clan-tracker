import { describe, it, expect } from "vitest";
import { describeActivity, activityDate } from "../runeProfile";
import { timeAgo } from "../dates";

describe("describeActivity", () => {
  it.each([
    [{ type: "new_item_obtained", enriched: { itemName: "Huntsman's kit" } }, "item", "New collection log item: Huntsman's kit"],
    [{ type: "valuable_drop", data: { value: 28592824 }, enriched: { itemName: "Dragon hunter crossbow" } }, "drop", "Valuable drop: Dragon hunter crossbow (28.6M gp)"],
    [{ type: "quest_completed", enriched: { questName: "A Shell of a Friend" } }, "quest", "Completed A Shell of a Friend"],
    [{ type: "achievement_diary_tier_completed", enriched: { areaName: "Varrock", tierName: "Hard" } }, "diary", "Completed the Hard Varrock diary"],
    [{ type: "combat_achievement_task_completed", enriched: { taskName: "Peach Conjurer", tierName: "Grandmaster" } }, "ca", "Combat achievement: Peach Conjurer (Grandmaster)"],
    [{ type: "combat_achievement_tier_reached", enriched: { tierName: "Elite" } }, "ca", "Reached Elite combat achievement rewards"],
    [{ type: "level_up", data: { name: "Defence", level: 95 } }, "level", "Reached 95 Defence"],
    [{ type: "xp_milestone", data: { name: "Firemaking", xp: 75000000 } }, "xp", "75M Firemaking XP"],
    [{ type: "maxed", data: {} }, "maxed", "Maxed every skill"],
  ])("words %j", (activity, kind, text) => {
    expect(describeActivity(activity)).toMatchObject({ kind, text });
  });

  it("uses the skill icon for level and XP milestones", () => {
    expect(describeActivity({ type: "level_up", data: { name: "Defence", level: 95 } }).skill).toBe("Defence");
  });

  it("falls back to the type for anything new", () => {
    expect(describeActivity({ type: "something_new" })).toEqual({ kind: "other", text: "something new" });
  });
});

describe("activityDate", () => {
  it("reads RuneProfile's zoneless timestamps as UTC", () => {
    expect(activityDate("2026-11-23 14:53:40.772003").toISOString()).toBe("2026-11-23T14:53:40.772Z");
  });
});

describe("timeAgo", () => {
  it("reads as minutes, hours or days", () => {
    const now = Date.parse("2026-11-23T12:00:00Z");
    expect(timeAgo("2026-11-23T11:43:00Z", now)).toBe("17 minutes ago");
    expect(timeAgo("2026-11-20T12:00:00Z", now)).toBe("3 days ago");
  });
});
