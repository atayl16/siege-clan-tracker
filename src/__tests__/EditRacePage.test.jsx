import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import EditRacePage from '../pages/EditRacePage';

let auth;
const races = [{ id: 'r1', title: 'Sailing Challenge', creator_id: 'u1', public: false, participants: [] }];

vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useRaces', () => ({ useRaces: () => ({ races, loading: false }) }));
// The form is tested on its own; here it only needs to show it was given the race.
vi.mock('../components/CreateRace', () => ({
  default: ({ race }) => <div>editing {race.title}</div>,
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/races/:id/edit" element={<EditRacePage />} />
      </Routes>
    </MemoryRouter>
  );

test('the creator gets the form for their race', () => {
  auth = { user: { id: 'u1' } };
  renderAt('/races/r1/edit');
  expect(screen.getByText('editing Sailing Challenge')).toBeInTheDocument();
});

test('anyone else is told only the creator can edit', () => {
  auth = { user: { id: 'u2' } };
  renderAt('/races/r1/edit');
  expect(screen.getByText(/only the member who created a race can edit it/i)).toBeInTheDocument();
  expect(screen.queryByText(/editing/)).not.toBeInTheDocument();
});

test('an unknown race is reported as not found', () => {
  auth = { user: { id: 'u1' } };
  renderAt('/races/nope/edit');
  expect(screen.getByText('Race Not Found')).toBeInTheDocument();
});
