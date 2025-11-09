import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AchievementsPage from '../pages/AchievementsPage';

test('renders AchievementsPage without crashing', () => {
  render(
    <MemoryRouter>
      <AchievementsPage />
    </MemoryRouter>
  );
  // Use getAllByText since there are multiple elements with 'achievement'
  expect(screen.getAllByText(/achievement/i).length).toBeGreaterThan(0);
}); 
