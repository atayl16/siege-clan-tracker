import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
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

test('the winner leads with a trophy, and unsynced participants say their starting point is not recorded', () => {
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
  expect(screen.getAllByText(/starting point not recorded yet/i)).toHaveLength(1);
});

describe('refresh', () => {
  const checked = {
    ...race,
    status: 'active',
    participants: race.participants.map((p) => ({
      ...p,
      baseline_set_at: '2026-11-09T00:00:00Z',
      updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    })),
  };

  test('says when progress was last checked', () => {
    renderCard({ race: checked });
    expect(screen.getByText('Updated 5 minutes ago')).toBeInTheDocument();
  });

  test('offers Refresh only when given a handler, and only on active races', () => {
    const { unmount } = renderCard({ race: checked });
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    unmount();

    const again = renderCard({ race: { ...checked, status: 'completed' }, onRefresh: vi.fn() });
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    again.unmount();

    renderCard({ race: checked, onRefresh: vi.fn() });
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('refreshes this race when pressed', async () => {
    const onRefresh = vi.fn().mockResolvedValue({ results: [{ raceId: 'r1', status: 'refreshed' }] });
    renderCard({ race: checked, onRefresh });
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledWith('r1');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('says when to try again if the race was only just refreshed', async () => {
    const onRefresh = vi.fn().mockResolvedValue({
      results: [{ raceId: 'r1', status: 'recently_refreshed', retryAfterSeconds: 42 }],
    });
    renderCard({ race: checked, onRefresh });
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('Try again in 42s');
  });

  test('shows the error when a refresh fails', async () => {
    const onRefresh = vi.fn().mockRejectedValue(new Error('Sign in to refresh a race.'));
    renderCard({ race: checked, onRefresh });
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('Sign in to refresh a race.');
  });
});

test("says who created the race, when known", () => {
  const { unmount } = renderCard({ race: { ...race, creator_name: 'roinrin' } });
  expect(screen.getByText(/Created .* by/)).toHaveTextContent(/by Roinrin$/);
  unmount();

  // Shown without the underscore; the account is still dan_xo.
  const second = renderCard({ race: { ...race, creator_name: 'dan_xo' } });
  expect(screen.getByText(/Created .* by/)).toHaveTextContent(/by Dan xo$/);
  second.unmount();

  renderCard({ race: { ...race, creator_name: null } });
  expect(screen.queryByText(/ by /)).not.toBeInTheDocument();
});

test('shows a skill racer\'s levels once their start is recorded', () => {
  render(
    <MemoryRouter>
      <RaceCard
        race={{
          id: 'lv', title: 'Thieving race', status: 'active', created_at: new Date().toISOString(),
          participants: [
            // 2,200,000 + 300,000 = level 82 now; + 1,058,594 = level 85.
            { id: 'a', player_name: 'Roinrin', metric: 'thieving', start_value: 2_200_000, current_value: 300_000, target_value: 1_058_594, baseline_set_at: '2026-11-01T00:00:00Z' },
            { id: 'b', player_name: 'Dan', metric: 'zulrah', start_value: 10, current_value: 5, target_value: 50, baseline_set_at: '2026-11-01T00:00:00Z' },
            { id: 'c', player_name: 'New', metric: 'thieving', start_value: 0, current_value: 0, target_value: 100_000, baseline_set_at: null },
          ],
        }}
      />
    </MemoryRouter>
  );
  expect(screen.getByText(/Level 82 → 85/)).toBeInTheDocument();
  // Bosses have no levels, and a racer with no start yet has none to show.
  expect(screen.getAllByText(/Level \d+ →/)).toHaveLength(1);
});
