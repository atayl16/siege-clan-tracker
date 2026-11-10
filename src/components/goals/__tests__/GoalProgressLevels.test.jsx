import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalProgress from '../GoalProgress';
import GoalCard from '../../GoalCard';

const thieving = {
  goal_type: 'skill',
  metric: 'thieving',
  start_value: 2_200_000,
  current_value: 2_500_000,
  target_value: 3_258_594,
  completed: false,
};

const valuesOf = (container) =>
  [...container.querySelectorAll('.ui-progress-stat')].map((stat) => stat.textContent);

test('shows a skill goal as levels, with the XP underneath', () => {
  const { container } = render(<GoalProgress goal={thieving} />);
  // Label, level, XP and gain on separate lines rather than one run of text.
  expect(valuesOf(container)).toEqual([
    'CurrentLevel 822,500,000 XP+300,000',
    'TargetLevel 853,258,594 XP',
  ]);
  expect(screen.getByText('Level 82')).toHaveClass('ui-progress-stat-main');
  expect(screen.getByText('+300,000')).toHaveClass('ui-gained-value');
});

test('shows a boss goal in kills and overall in XP, with no level', () => {
  const { container, rerender } = render(
    <GoalProgress goal={{ ...thieving, goal_type: 'boss', metric: 'zulrah', start_value: 10, current_value: 50, target_value: 100 }} />
  );
  expect(valuesOf(container)).toEqual(['Current50 kills+40', 'Target100 kills']);

  rerender(<GoalProgress goal={{ ...thieving, metric: 'overall' }} />);
  expect(valuesOf(container)).toEqual(['Current2,500,000 XP+300,000', 'Target3,258,594 XP']);
  expect(screen.queryByText(/Level/)).not.toBeInTheDocument();
});

test('the community goal card shows the level journey', () => {
  render(<GoalCard goal={{ ...thieving, player_name: 'roinrin' }} />);
  expect(screen.getByText('Level 82 → 85')).toBeInTheDocument();
});
