import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RaceCard from '../components/RaceCard';

test('renders RaceCard without crashing', () => {
  const mockRace = { race_participants: [] };
  render(
    <MemoryRouter>
      <RaceCard race={mockRace} />
    </MemoryRouter>
  );
  expect(screen.getByText(/private/i)).toBeInTheDocument();
  expect(screen.getByText(/created/i)).toBeInTheDocument();
}); 
