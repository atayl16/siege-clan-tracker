import React from 'react';
import { format } from 'date-fns';
import { titleize } from '../utils/stringUtils';
import { hasLevels, levelForXp } from '../utils/skillLevels';
import './GoalCard.css';

import Badge from './ui/Badge';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';

const shortDate = (value) => format(new Date(value), 'MMM d');

/**
 * "Level 92 → 99" while a skill goal still has levels to go, or just
 * "Level 84" once it is reached (or when the goal sits inside one level).
 * Null for bosses and overall, which have no level.
 */
function levelLine(goal) {
  if (goal.goal_type !== 'skill' || !hasLevels(goal.metric)) return null;
  const now = levelForXp(goal.current_value);
  const target = levelForXp(goal.target_value);
  return now >= target ? `Level ${now}` : `Level ${now} → ${target}`;
}

/**
 * A public goal on the Races & Goals board. A compact version of the
 * profile's goal card: whose goal it is first, then the skill or boss, how
 * far along it is, and its deadline or when it was done.
 */
export default function GoalCard({ goal }) {
  const unit = goal.goal_type === 'skill' ? 'XP' : 'kills';
  const needed = Math.max(0, goal.target_value - goal.start_value);
  const gained = Math.max(0, goal.current_value - goal.start_value);
  const completed = Boolean(goal.completed);
  const percent = completed
    ? 100
    : needed > 0
      ? Math.min(100, Math.floor((gained / needed) * 100))
      : 0;

  // Past its deadline and not done. Compared by day, so a goal due today is
  // not overdue yet.
  const overdue =
    !completed &&
    goal.target_date &&
    format(new Date(goal.target_date), 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');

  let when = null;
  if (completed) {
    when = goal.completed_date ? `Done ${shortDate(goal.completed_date)}` : 'Done';
  } else if (goal.target_date) {
    when = overdue ? `Overdue (${shortDate(goal.target_date)})` : `Due ${shortDate(goal.target_date)}`;
  }

  const levels = levelLine(goal);

  return (
    <Card className={`ui-goal-card ui-board-goal ${completed ? 'ui-board-goal-done' : ''}`}>
      <Card.Header className="ui-board-goal-header">
        <span className="ui-board-goal-player">{goal.player_name || 'Unknown'}</span>
        <span className="ui-board-goal-badges">
          <Badge variant={goal.goal_type === 'boss' ? 'danger' : 'primary'} className="ui-board-goal-type">
            {goal.goal_type}
          </Badge>
          {completed && <Badge variant="success">Completed</Badge>}
        </span>
      </Card.Header>

      <Card.Body>
        <h3 className="ui-board-goal-metric">{titleize(goal.metric)}</h3>
        {levels && <div className="ui-board-goal-levels">{levels}</div>}

        <div className="ui-board-goal-bar">
          <ProgressBar
            value={percent}
            showPercentage={false}
            variant={completed ? 'success' : 'primary'}
            animated={!completed}
          />
          <span className="ui-board-goal-percent">{percent}%</span>
        </div>

        <div className="ui-board-goal-footer">
          <span className="ui-board-goal-amount">
            {completed
              ? `+${gained.toLocaleString()} ${unit} (goal ${needed.toLocaleString()})`
              : `${gained.toLocaleString()} / ${needed.toLocaleString()} ${unit}`}
          </span>
          {when && (
            <span className={`ui-board-goal-when ${overdue ? 'ui-board-goal-overdue' : ''}`}>{when}</span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
