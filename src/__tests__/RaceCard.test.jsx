import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RaceCard from '../components/RaceCard';

test('renders RaceCard without crashing', () => {
  const mockRace = {
    id: 1,
    title: 'Test Race',
    description: 'A test race description',
    public: false,
    created_at: new Date().toISOString(),
    end_date: null,
    race_participants: []
  };
  render(
    <MemoryRouter>
      <RaceCard race={mockRace} />
    </MemoryRouter>
  );
  expect(screen.getByText(/private/i)).toBeInTheDocument();
  expect(screen.getByText(/created/i)).toBeInTheDocument();
}); 
