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

test('shows the levels alongside the XP of a skill goal', () => {
  render(<GoalProgress goal={thieving} />);
  expect(screen.getByText(/Current: 2,500,000 \(level 82\)/)).toBeInTheDocument();
  expect(screen.getByText('Target: 3,258,594 (level 85)')).toBeInTheDocument();
});

test('shows no level for a boss goal or overall', () => {
  const { rerender } = render(
    <GoalProgress goal={{ ...thieving, goal_type: 'boss', metric: 'zulrah', start_value: 0, current_value: 50, target_value: 100 }} />
  );
  expect(screen.queryByText(/level/)).not.toBeInTheDocument();

  rerender(<GoalProgress goal={{ ...thieving, metric: 'overall' }} />);
  expect(screen.queryByText(/level/)).not.toBeInTheDocument();
});

test('the community goal card shows the level journey', () => {
  render(<GoalCard goal={{ ...thieving, player_name: 'roinrin' }} />);
  expect(screen.getByText('Level 82 → 85')).toBeInTheDocument();
});
