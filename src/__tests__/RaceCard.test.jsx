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
  // Use getAllByText since there may be multiple elements with these texts
  expect(screen.getAllByText(/private/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/created/i).length).toBeGreaterThan(0);
}); 

// The shape useRaces returns: participants embedded as `participants`.
const race = {
  id: 'r1',
  title: 'Sailing Challenge',
  public: false,
  created_at: new Date().toISOString(),
  end_date: new Date(Date.now() + 4 * 86400000).toISOString(),
  participants: [
    { id: 'p1', player_name: 'Roinrin', metric: 'sailing', current_value: 500, target_value: 1000 },
    { id: 'p2', player_name: 'Zezima', metric: 'sailing', current_value: 900, target_value: 1000 },
  ],
};

const renderCard = (props) =>
  render(
    <MemoryRouter>
      <RaceCard race={race} isOwner {...props} />
    </MemoryRouter>
  );

test('shows the participants useRaces returns, leader first', () => {
  // Regression: the card read race.race_participants, which useRaces never
  // sets, so every race rendered with nobody in it.
  renderCard();

  const names = screen.getAllByText(/Roinrin|Zezima/).map((el) => el.textContent);
  expect(names).toEqual(['Zezima', 'Roinrin']);
  expect(screen.getByText('900 / 1,000')).toBeInTheDocument();
  expect(screen.getAllByText('Sailing')).toHaveLength(2);
});

test('does not link to race pages that do not exist', () => {
  // /races/:id and /races/:id/edit have no route; both links led to the 404.
  renderCard();

  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText('Sailing Challenge')).toBeInTheDocument();
});
