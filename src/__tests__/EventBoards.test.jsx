import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RacesBoard from '../components/events/RacesBoard';
import GoalsBoard from '../components/events/GoalsBoard';

let auth = { user: null, userClaims: [] };
const races = [
  { id: 'pub', title: 'Public Sailing', public: true, creator_id: 'other', created_at: new Date().toISOString(), participants: [] },
  { id: 'mine', title: 'My Private Race', public: false, creator_id: 'u1', created_at: new Date().toISOString(), participants: [] },
];
const goals = [
  { id: 'g1', user_id: 'other', wom_id: 7, goal_type: 'skill', metric: 'runecrafting', start_value: 0, current_value: 10, target_value: 100, public: true },
];

vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
// The real useRaces shape (src/hooks/useRaces.js), including the fields
// this page does not read.
vi.mock('../hooks/useRaces', () => ({
  useRaces: () => ({
    races,
    createRace: vi.fn(),
    updateRace: vi.fn(),
    activeRaces: races.filter((r) => r.creator_id === auth.user?.id),
    publicRaces: races.filter((r) => r.public === true),
    loading: false,
    error: null,
    refresh: vi.fn(),
    refreshRaces: vi.fn(),
  }),
}));
vi.mock('../hooks/useUserGoals', () => ({
  useUserGoals: () => ({ userGoals: goals, publicGoals: goals, loading: false, error: null }),
}));
vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({ members: [{ wom_id: 7, name: 'Moonfern' }] }),
}));
vi.mock('../components/CreateRace', () => ({ default: () => null }));

const renderRaces = () => render(<MemoryRouter><RacesBoard /></MemoryRouter>);
const renderGoals = () => render(<MemoryRouter><GoalsBoard /></MemoryRouter>);

beforeEach(() => {
  auth = { user: null, userClaims: [] };
});

test('renders for a logged-out visitor and lists only public races', () => {
  renderRaces();
  expect(screen.getByText('Public Sailing')).toBeInTheDocument();
  expect(screen.queryByText('My Private Race')).not.toBeInTheDocument();
});

test('shows public goals with the player name looked up from members', () => {
  renderGoals();
  expect(screen.getByText('Moonfern')).toBeInTheDocument();
  expect(screen.getByText('Runecrafting')).toBeInTheDocument();
});

test('is a community board: a signed-in member sees only public races', () => {
  // Your own races (and creating one) live on the profile's Races tab.
  auth = { user: { id: 'u1' }, userClaims: [] };
  renderRaces();
  expect(screen.getByText('Public Sailing')).toBeInTheDocument();
  expect(screen.queryByText('My Private Race')).not.toBeInTheDocument();
});
