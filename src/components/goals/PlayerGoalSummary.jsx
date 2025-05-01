import React from 'react';
import { useUserGoals } from '../../hooks/useUserGoals'; // Updated to use new hook
import GoalProgress from './GoalProgress';
import './PlayerGoalSummary.css';

export default function PlayerGoalSummary({ playerId, userId }) {
  // Use the new hook
  const { goals, loading } = useUserGoals();

  if (!playerId || !userId) {
    return (
      <div className="inline-goals-empty">
        {!userId ? "User ID missing" : "No player selected"}
      </div>
    );
  }

  if (loading) {
    return <div className="inline-goals-loading">Loading goals...</div>;
  }

  // Filter goals for the specific player and user
  const filteredGoals = goals?.filter(
    (goal) => goal.user_id === userId && goal.wom_id === playerId
  );

  if (!filteredGoals || filteredGoals.length === 0) {
    return <div className="inline-goals-empty">No active goals</div>;
  }

  // Get up to 3 uncompleted goals
  const activeGoals = filteredGoals.filter((goal) => !goal.completed).slice(0, 3);

  return (
    <div className="inline-goals-container">
      <h4 className="inline-goals-header">Current Goals</h4>
      <div className="inline-goals-list">
        {activeGoals.map((goal) => (
          <div key={goal.id} className="inline-goal-item">
            <div className="inline-goal-title">
              {goal.metric} ({goal.goal_type})
            </div>
            <GoalProgress goal={goal} />
          </div>
        ))}
      </div>
    </div>
  );
}
