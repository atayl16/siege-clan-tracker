import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProgressPage from '../pages/ProgressPage';

let auth = { user: null, userClaims: [] };
const races = [
  { id: 'pub', title: 'Public Sailing', public: true, creator_id: 'other', created_at: new Date().toISOString(), participants: [] },
  { id: 'mine', title: 'My Private Race', public: false, creator_id: 'u1', created_at: new Date().toISOString(), participants: [] },
];
const goals = [
  { id: 'g1', user_id: 'other', wom_id: 7, goal_type: 'skill', metric: 'runecrafting', start_value: 0, current_value: 10, target_value: 100, public: true },
];

vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
// Exactly what the real hooks return.
vi.mock('../hooks/useRaces', () => ({
  useRaces: () => ({ races, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('../hooks/useUserGoals', () => ({
  useUserGoals: () => ({ userGoals: goals, publicGoals: goals, loading: false, error: null }),
}));
vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({ members: [{ wom_id: 7, name: 'Roinrin' }] }),
}));
vi.mock('../components/CreateRace', () => ({ default: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>
  );

beforeEach(() => {
  auth = { user: null, userClaims: [] };
});

test('renders for a logged-out visitor and lists only public races', () => {
  // Regression: read activeRaces/publicRaces from useRaces, which returns
  // `races`, so publicRaces.filter threw and the page was blank.
  renderPage();
  expect(screen.getByText('Public Sailing')).toBeInTheDocument();
  expect(screen.queryByText('My Private Race')).not.toBeInTheDocument();
});

test('shows public goals with the player name looked up from members', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /Member Goals/ }));
  expect(screen.getByText('Roinrin')).toBeInTheDocument();
  expect(screen.getByText('Runecrafting')).toBeInTheDocument();
});

test("a signed-in member's My Races tab includes the races they created", () => {
  auth = { user: { id: 'u1' }, userClaims: [] };
  renderPage();
  expect(screen.getByText('My Private Race')).toBeInTheDocument();
});
