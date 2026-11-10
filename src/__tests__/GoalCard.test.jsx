import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GoalCard from '../components/GoalCard';

const goal = (overrides = {}) => ({
  goal_type: 'boss',
  metric: 'zulrah',
  player_name: 'TestPlayer',
  start_value: 0,
  current_value: 50,
  target_value: 100,
  completed: false,
  ...overrides,
});

afterEach(() => vi.useRealTimers());

test('leads with whose goal it is, with the type as a pill', () => {
  render(<GoalCard goal={goal()} />);
  expect(screen.getByText('TestPlayer')).toHaveClass('ui-board-goal-player');
  expect(screen.getByText('boss')).toHaveClass('ui-badge-danger');
  expect(screen.getByText('Zulrah')).toBeInTheDocument();
});

test('shows how far along an active goal is', () => {
  render(<GoalCard goal={goal()} />);
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(screen.getByText('50 / 100 kills')).toBeInTheDocument();
  expect(screen.queryByText('Completed')).not.toBeInTheDocument();
});

test('shows a skill goal by level, and by gain', () => {
  // 13,034,431 is level 99, 6,517,253 level 92: the gain needed is 6,517,178.
  render(
    <GoalCard
      goal={goal({ goal_type: 'skill', metric: 'sailing', start_value: 6_517_253, current_value: 6_588_053, target_value: 13_034_431 })}
    />
  );
  expect(screen.getByText('Level 92 → 99')).toBeInTheDocument();
  expect(screen.getByText('70,800 / 6,517,178 XP')).toBeInTheDocument();
  expect(screen.getByText('1%')).toBeInTheDocument();
});

test('a completed goal reads as done, not as over target', () => {
  // The live board showed "4,918 / 2,000 XP" with an in-progress bar.
  const { container } = render(
    <GoalCard
      goal={goal({
        goal_type: 'skill', metric: 'runecrafting', start_value: 3_143_952, current_value: 3_148_870,
        target_value: 3_145_952, completed: true, completed_date: '2026-11-10T12:00:00Z',
      })}
    />
  );
  expect(screen.getByText('Completed')).toHaveClass('ui-badge-success');
  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('+4,918 XP (goal 2,000)')).toBeInTheDocument();
  expect(screen.getByText('Done Nov 10')).toBeInTheDocument();
  // Both values are level 84, so no arrow.
  expect(screen.getByText('Level 84')).toBeInTheDocument();
  expect(container.querySelector('.ui-progress-success')).not.toBeNull();
  expect(container.querySelector('.ui-progress-animated')).toBeNull();
});

test('says when a goal is due, and when it is overdue', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T12:00:00'));

  const { rerender } = render(<GoalCard goal={goal({ target_date: '2026-11-13T12:00:00' })} />);
  expect(screen.getByText('Due Nov 13')).not.toHaveClass('ui-board-goal-overdue');

  rerender(<GoalCard goal={goal({ target_date: '2026-11-08T12:00:00' })} />);
  expect(screen.getByText('Overdue (Nov 8)')).toHaveClass('ui-board-goal-overdue');

  // Due today is not overdue yet.
  rerender(<GoalCard goal={goal({ target_date: '2026-11-10T12:00:00' })} />);
  expect(screen.getByText('Due Nov 10')).toBeInTheDocument();
});
