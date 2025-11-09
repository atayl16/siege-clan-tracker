import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardPage from '../pages/LeaderboardPage';

test('renders LeaderboardPage without crashing', () => {
  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
  // Use getAllByText since there are multiple elements with 'leaderboard'
  expect(screen.getAllByText(/leaderboard/i).length).toBeGreaterThan(0);
}); 
