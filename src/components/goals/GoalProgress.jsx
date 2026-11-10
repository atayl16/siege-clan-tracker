import React from 'react';
import { hasLevels, levelForXp } from '../../utils/skillLevels';
import './GoalProgress.css';

/**
 * One side of the values row. A skill reads as its level, with the XP
 * underneath; a boss (or overall, whose level is the total level) reads as
 * the number itself.
 */
function valueLines(goal, value) {
  const amount = value.toLocaleString();
  if (goal.goal_type === 'boss') return { main: `${amount} kills`, detail: null };
  if (!hasLevels(goal.metric)) return { main: `${amount} XP`, detail: null };
  return { main: `Level ${levelForXp(value)}`, detail: `${amount} XP` };
}

export default function GoalProgress({ goal }) {
  // Calculate progress percentage
  const progress = Math.min(
    Math.floor(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100),
    100
  );
  
  // Calculate expected progress based on time elapsed if target date exists
  let expectedProgress = null;
  if (goal.target_date) {
    const startDate = new Date(goal.start_date).getTime();
    const targetDate = new Date(goal.target_date).getTime();
    const currentDate = new Date().getTime();
    const totalTimespan = targetDate - startDate;
    const elapsedTimespan = currentDate - startDate;
    
    if (totalTimespan > 0) {
      expectedProgress = Math.min(Math.floor((elapsedTimespan / totalTimespan) * 100), 100);
    }
  }
  
  // Determine status
  let status = '';
  if (goal.completed) {
    status = 'completed';
  } else if (expectedProgress !== null) {
    status = progress >= expectedProgress ? 'ahead' : 'behind';
  }

  const current = valueLines(goal, goal.current_value);
  const target = valueLines(goal, goal.target_value);

  return (
    <div className="ui-goal-progress">
      <div className="ui-progress-header">
        <span className="ui-progress-percent">Progress: {progress}%</span>
        {status === 'ahead' && (
          <span className="ui-status ui-status-ahead">Ahead of schedule</span>
        )}
        {status === 'behind' && (
          <span className="ui-status ui-status-behind">Behind schedule</span>
        )}
        {status === 'completed' && (
          <span className="ui-status ui-status-completed">Completed!</span>
        )}
      </div>
      
      <div className="ui-progress-container">
        <div 
          className={`ui-progress-bar ui-status-${status}`} 
          style={{ width: `${progress}%` }}
        />
        
        {expectedProgress !== null && !goal.completed && (
          <div 
            className="ui-expected-marker" 
            style={{ left: `${expectedProgress}%` }} 
            title={`Expected progress: ${expectedProgress}%`}
          />
        )}
      </div>
      
      <div className="ui-progress-values">
        <div className="ui-progress-stat">
          <span className="ui-progress-stat-label">Current</span>
          <span className="ui-progress-stat-main">{current.main}</span>
          <span className="ui-progress-stat-detail">
            {current.detail}
            {goal.start_value > 0 && (
              <span className="ui-gained-value">
                +{(goal.current_value - goal.start_value).toLocaleString()}
              </span>
            )}
          </span>
        </div>
        <div className="ui-progress-stat ui-progress-stat-target">
          <span className="ui-progress-stat-label">Target</span>
          <span className="ui-progress-stat-main">{target.main}</span>
          {target.detail && <span className="ui-progress-stat-detail">{target.detail}</span>}
        </div>
      </div>
    </div>
  );
}
