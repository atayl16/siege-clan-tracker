import { titleize } from "./stringUtils";
import { bossName } from "./achievements";

/**
 * A goal's name as people read it: "Attack", "Kree'Arra",
 * "Chambers of Xeric". Was the raw WOM id ("attack (skill)") on profile cards.
 *
 * @param {{ metric: string, goal_type?: string }} goal
 */
export function goalName(goal) {
  if (!goal?.metric) return "";
  return goal.goal_type === "boss" ? bossName(goal.metric) : titleize(goal.metric);
}
