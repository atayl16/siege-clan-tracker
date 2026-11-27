import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import GoalProgress from '../GoalProgress';

afterEach(() => vi.useRealTimers());

// Ten days from local midnight on 10 Nov to the end of the 19th, the due day.
// Mid-November, so no clock change falls inside the window in the US, UK or
// Australia.
const goal = (currentValue) => ({
  goal_type: 'boss',
  metric: 'zulrah',
  start_value: 0,
  current_value: currentValue,
  target_value: 100,
  completed: false,
  start_date: new Date(2026, 10, 10).toISOString(),
  // A date field's "2026-11-19", as Supabase stores it.
  target_date: '2026-11-19T00:00:00+00:00',
});

test('gives a goal the whole of its due day', () => {
  // Midday on the due day: 9.5 of 10 days gone, so 95% is on schedule. It
  // used to count to the start of the due day and call anything short of
  // 100% behind.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 19, 12));

  const { rerender } = render(<GoalProgress goal={goal(96)} />);
  expect(screen.getByText('Ahead of schedule')).toBeInTheDocument();

  rerender(<GoalProgress goal={goal(90)} />);
  expect(screen.getByText('Behind schedule')).toBeInTheDocument();
});

test('shows no schedule without a deadline', () => {
  render(<GoalProgress goal={{ ...goal(50), target_date: null }} />);
  expect(screen.queryByText(/schedule/)).not.toBeInTheDocument();
});
