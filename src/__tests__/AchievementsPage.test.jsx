import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AchievementsPage from '../pages/AchievementsPage';

test('renders AchievementsPage without crashing', () => {
  render(
    <MemoryRouter>
      <AchievementsPage />
    </MemoryRouter>
  );
  expect(screen.getByText(/achievement/i)).toBeInTheDocument();
}); 
