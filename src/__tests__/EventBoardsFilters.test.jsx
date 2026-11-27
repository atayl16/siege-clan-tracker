import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import RacesBoard from '../components/events/RacesBoard';
import GoalsBoard from '../components/events/GoalsBoard';

const races = [
  { id: 'r1', title: 'Sailing sprint', public: true, status: 'active', created_at: new Date().toISOString(),
    participants: [{ id: 'p1', player_name: 'Ash ko', metric: 'sailing', current_value: 0, target_value: 10 }] },
  { id: 'r2', title: 'Zulrah week', public: true, status: 'completed', created_at: new Date().toISOString(), participants: [] },
];
const goals = [
  { id: 'g1', wom_id: 1, goal_type: 'skill', metric: 'sailing', start_value: 0, current_value: 10, target_value: 100, public: true, completed: false },
  { id: 'g2', wom_id: 2, goal_type: 'boss', metric: 'zulrah', start_value: 0, current_value: 90, target_value: 100, public: true, completed: false },
  { id: 'g3', wom_id: 1, goal_type: 'skill', metric: 'runecrafting', start_value: 0, current_value: 100, target_value: 100, public: true, completed: true },
];

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null, userClaims: [] }) }));
vi.mock('../hooks/useRaces', () => ({ useRaces: () => ({ races, loading: false, refreshProgress: vi.fn() }) }));
vi.mock('../hooks/useUserGoals', () => ({ useUserGoals: () => ({ publicGoals: goals, loading: false }) }));
vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({ members: [{ wom_id: 1, name: 'Moonfern' }, { wom_id: 2, name: 'Ash ko' }] }),
}));

const renderRaces = () => render(<MemoryRouter><RacesBoard /></MemoryRouter>);
const renderGoals = () => render(<MemoryRouter><GoalsBoard /></MemoryRouter>);
const goalTitles = () => [...document.querySelectorAll('.ui-goals-grid h3')].map((h) => h.textContent);

test('searches races by racer and filters them by status', async () => {
  renderRaces();
  const search = screen.getByRole('searchbox', { name: 'Search races or racers' });

  await userEvent.type(search, 'ash');
  expect(screen.getByText('Sailing sprint')).toBeInTheDocument();
  expect(screen.queryByText('Zulrah week')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 2');

  await userEvent.clear(search);
  await userEvent.click(within(screen.getByRole('group', { name: 'Race status' })).getByRole('button', { name: 'Finished' }));
  expect(screen.getByText('Zulrah week')).toBeInTheDocument();
  expect(screen.queryByText('Sailing sprint')).not.toBeInTheDocument();
});

test('lists active goals closest to done first, completed ones last', async () => {
  renderGoals();
  expect(goalTitles()).toEqual(['Zulrah', 'Sailing', 'Runecrafting']);
  // Nothing filtered yet, so no summary line.
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('filters goals by character, type and status', async () => {
  renderGoals();

  await userEvent.type(screen.getByRole('searchbox', { name: /Search characters/ }), 'moonfern');
  expect(goalTitles()).toEqual(['Sailing', 'Runecrafting']);

  await userEvent.click(within(screen.getByRole('group', { name: 'Goal status' })).getByRole('button', { name: 'Completed' }));
  expect(goalTitles()).toEqual(['Runecrafting']);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 3');

  await userEvent.click(within(screen.getByRole('group', { name: 'Goal type' })).getByRole('button', { name: 'Bosses' }));
  expect(screen.getByText('No goals match')).toBeInTheDocument();

  // The empty state's button clears the search and every filter.
  await userEvent.click(screen.getAllByRole('button', { name: /Clear Filters/ }).at(-1));
  expect(goalTitles()).toEqual(['Zulrah', 'Sailing', 'Runecrafting']);
  expect(screen.getByRole('searchbox', { name: /Search characters/ })).toHaveValue('');
});

test('sorts goals by newest or deadline when asked', async () => {
  renderGoals();
  const sort = screen.getByRole('combobox');
  expect(sort).toHaveValue('progress');
  await userEvent.selectOptions(sort, 'deadline');
  expect(sort).toHaveValue('deadline');
  // Completed goals stay last whatever the sort.
  expect(goalTitles().at(-1)).toBe('Runecrafting');
});
