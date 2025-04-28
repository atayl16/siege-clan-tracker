import React from 'react';
import { usePlayerGoals } from '../../context/DataContext';
import GoalProgress from './GoalProgress';
import './PlayerGoalSummary.css';

export default function PlayerGoalSummary({ playerId, userId }) {
  // Move the hook call before any conditional logic
  const { goals, loading } = usePlayerGoals(userId, playerId);

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

  if (!goals || goals.length === 0) {
    return <div className="inline-goals-empty">No active goals</div>;
  }

  // Get up to 3 uncompleted goals
  const activeGoals = goals
    .filter(goal => !goal.completed)
    .slice(0, 3);

  return (
    <div className="inline-goals-container">
      <h4 className="inline-goals-header">Current Goals</h4>
      <div className="inline-goals-list">
        {activeGoals.map(goal => (
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
