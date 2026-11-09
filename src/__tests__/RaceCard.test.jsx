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
  expect(screen.getByText('+900 / 1,000')).toBeInTheDocument();
  expect(screen.getAllByText('Sailing')).toHaveLength(2);
});

test('links the owner to the edit page, and nobody else', () => {
  // The title stays plain text: there is no race detail page.
  const { unmount } = renderCard({ isOwner: true });
  expect(screen.getByRole('link', { name: 'Edit Race' })).toHaveAttribute('href', '/races/r1/edit');
  expect(screen.getAllByRole('link')).toHaveLength(1);
  unmount();

  renderCard({ isOwner: false });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('the winner leads with a trophy, and unsynced participants say tracking has not started', () => {
  const card = {
    ...race,
    participants: [
      { id: 'p1', player_name: 'Roinrin', metric: 'sailing', current_value: 1000, target_value: 1000, is_winner: true, baseline_set_at: '2026-11-09T00:00:00Z' },
      { id: 'p2', player_name: 'Zezima', metric: 'sailing', current_value: 0, target_value: 500, is_winner: false, baseline_set_at: null },
    ],
  };
  renderCard({ race: card });

  const names = screen.getAllByText(/^(Roinrin|Zezima)$/).map((el) => el.textContent);
  expect(names[0]).toBe('Roinrin');
  expect(screen.getByLabelText('Winner')).toBeInTheDocument();
  expect(screen.getByText('+1,000 / 1,000')).toBeInTheDocument();
  expect(screen.getAllByText(/tracking starts at the next hourly sync/i)).toHaveLength(1);
});
