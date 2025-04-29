import React from 'react';
import { format } from 'date-fns';
import { titleize } from '../utils/stringUtils';
import './GoalCard.css';

import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';

export default function GoalCard({ goal }) {
  // Calculate progress percentage
  const total = goal.target_value - goal.start_value;
  const current = goal.current_value - goal.start_value;
  const progressPercent = total > 0 
    ? Math.min(100, Math.round((current / total) * 100))
    : 0;
  
  // Format target date
  const targetDate = goal.target_date 
    ? format(new Date(goal.target_date), 'MMM d, yyyy')
    : null;
  
  // Determine if goal is skill or boss
  const isSkill = goal.goal_type === 'skill';
  
  // Format label based on goal type
  const progressLabel = isSkill
    ? `${current.toLocaleString()} / ${total.toLocaleString()} XP`
    : `${current.toLocaleString()} / ${total.toLocaleString()} kills`;
  
  return (
    <Card className="ui-goal-card">
      <Card.Header className="ui-goal-header">
        <span className="ui-goal-type">
          {goal.goal_type}
        </span>
        <span className="ui-goal-player">
          {goal.player_name}
        </span>
      </Card.Header>
      
      <Card.Body>
        <h3 className="ui-goal-title">
          {titleize(goal.metric)}
        </h3>
        
        <div className="ui-goal-progress">
          <ProgressBar 
            value={progressPercent} 
            label={progressLabel}
            variant={progressPercent >= 100 ? "success" : "primary"} 
          />
        </div>
        
        {goal.completed ? (
          <div className="ui-goal-status ui-completed">
            Completed!
          </div>
        ) : targetDate ? (
          <div className="ui-goal-deadline">
            Target date: {targetDate}
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
