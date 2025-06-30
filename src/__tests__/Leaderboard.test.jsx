import { render, screen } from '@testing-library/react';
import Leaderboard from '../components/Leaderboard';

test('renders Leaderboard component without crashing', () => {
  render(<Leaderboard />);
  // Check for the empty state text only
  expect(screen.getByText(/no players with siege scores found/i)).toBeInTheDocument();
}); 
