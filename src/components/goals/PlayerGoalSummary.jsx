import React from "react";
import GoalProgress from "./GoalProgress";
import "./PlayerGoalSummary.css";
import { goalName } from "../../utils/goalName";

/**
 * Up to three of a character's goals still in progress, on its profile card.
 * Shows nothing when there are none: the card's button then reads
 * "Set a Goal", so an empty "Current Goals" heading is not left floating
 * above it.
 *
 * @param {object} props
 * @param {Array<object>} props.goals - this character's goals (user_goals rows)
 */
export default function PlayerGoalSummary({ goals }) {
  const activeGoals = (goals || []).filter((goal) => !goal.completed).slice(0, 3);
  if (!activeGoals.length) return null;

  return (
    <div className="inline-goals-container">
      <h4 className="inline-goals-header">Current Goals</h4>
      <div className="inline-goals-list">
        {activeGoals.map((goal) => (
          <div key={goal.id} className="inline-goal-item">
            <div className="inline-goal-title">{goalName(goal)}</div>
            <GoalProgress goal={goal} />
          </div>
        ))}
      </div>
    </div>
  );
}
