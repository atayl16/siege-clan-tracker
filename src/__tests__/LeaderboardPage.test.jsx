import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardPage from '../pages/LeaderboardPage';

test('renders LeaderboardPage without crashing', () => {
  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
  expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
}); 
