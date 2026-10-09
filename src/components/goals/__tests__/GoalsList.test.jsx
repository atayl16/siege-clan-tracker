import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GoalsList from '../GoalsList';

const hookResult = {
  userGoals: [],
  loading: false,
  error: null,
  refresh: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
};
const useUserGoals = vi.fn(() => hookResult);

vi.mock('../../../hooks/useUserGoals', () => ({
  useUserGoals: (...args) => useUserGoals(...args),
}));
vi.mock('../../../services/goalProgressService', () => ({ updatePlayerGoals: vi.fn() }));
vi.mock('../CreateGoal', () => ({ default: () => null }));

const player = { wom_id: 42, name: 'zezima' };

describe('GoalsList', () => {
  it("renders only this character's goals, scoped to the user", () => {
    // Used to read `goals` from the hook, which returns `userGoals`; the
    // undefined list then crashed on .map and blanked the profile page.
    hookResult.userGoals = [
      { id: 'a', wom_id: 42, goal_type: 'skill', metric: 'attack', target_value: 100, current_value: 50, start_value: 0 },
      { id: 'b', wom_id: 7, goal_type: 'skill', metric: 'magic_other_char', target_value: 100, current_value: 50, start_value: 0 },
    ];

    render(<GoalsList player={player} userId="u1" onClose={vi.fn()} />);

    expect(useUserGoals).toHaveBeenCalledWith('u1');
    expect(screen.getByText(/attack/i)).toBeInTheDocument();
    expect(screen.queryByText(/magic_other_char|magic other char/i)).not.toBeInTheDocument();
  });

  it('shows the empty state rather than crashing when there are no goals', () => {
    hookResult.userGoals = [];
    render(<GoalsList player={player} userId="u1" onClose={vi.fn()} />);
    expect(screen.queryByText(/loading goals/i)).not.toBeInTheDocument();
  });
});
