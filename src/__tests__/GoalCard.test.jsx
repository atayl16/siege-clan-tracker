import { render, screen } from '@testing-library/react';
import GoalCard from '../components/GoalCard';

test('renders GoalCard without crashing', () => {
  const mockGoal = {
    target_value: 100,
    start_value: 0,
    current_value: 50,
    goal_type: 'boss',
    player_name: 'TestPlayer',
    metric: 'zulrah',
    completed: false
  };
  render(<GoalCard goal={mockGoal} />);
  expect(screen.getByText('50 / 100 kills')).toBeInTheDocument();
}); 
