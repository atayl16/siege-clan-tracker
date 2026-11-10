import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Roinrin has 2,200,000 Thieving XP: level 81. Level 85 is 3,258,594 XP.
const createRace = vi.fn().mockResolvedValue({ id: 'r1' });
const updateRace = vi.fn().mockResolvedValue(undefined);
const fetchFreshPlayerStats = vi.fn();

vi.mock('../hooks/useRaces', () => ({ useRaces: () => ({ createRace, updateRace }) }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userClaims: [{ wom_id: 1, members: { wom_id: 1, name: 'Roinrin' } }] }),
}));
vi.mock('../services/playerRefresh', () => ({ fetchFreshPlayerStats: (...args) => fetchFreshPlayerStats(...args) }));
vi.mock('../services/goalProgressService', () => ({ fetchPlayerStats: async () => { throw new Error('down'); } }));
vi.mock('../components/MemberSelector', () => ({ default: () => null }));
vi.mock('../components/MetricSelector', () => ({
  default: ({ onMetricChange }) => (
    <>
      <button type="button" onClick={() => onMetricChange('thieving')}>pick thieving</button>
      <button type="button" onClick={() => onMetricChange('overall')}>pick overall</button>
    </>
  ),
}));

import CreateRace from '../components/CreateRace';

const thieving = { latestSnapshot: { data: { skills: { thieving: { experience: 2_200_000 } } } } };

beforeEach(() => {
  createRace.mockClear();
  updateRace.mockClear();
  fetchFreshPlayerStats.mockReset();
  fetchFreshPlayerStats.mockResolvedValue(thieving);
});

const typeTitle = () =>
  userEvent.type(screen.getByPlaceholderText(/woodcutting challenge/i), 'Thieving race');

test('a level target becomes the XP gain it needs from current XP', async () => {
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await typeTitle();
  await userEvent.click(screen.getByText('pick thieving'));

  expect(await screen.findByText('Level 81 now (2,200,000 XP).')).toBeInTheDocument();
  expect(fetchFreshPlayerStats).toHaveBeenCalledWith(1);

  await userEvent.type(screen.getByLabelText('Target level'), '85');
  expect(screen.getByText('Level 81 now. Level 85 is +1,058,594 XP.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /create race/i }));
  // Races store the gain: 3,258,594 - 2,200,000.
  expect(createRace).toHaveBeenCalledWith(
    expect.objectContaining({
      participants: [expect.objectContaining({ wom_id: 1, metric: 'thieving', target_value: 1_058_594 })],
    })
  );
});

test('refuses a level the racer already has', async () => {
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await typeTitle();
  await userEvent.click(screen.getByText('pick thieving'));
  await screen.findByText('Level 81 now (2,200,000 XP).');

  screen.getByRole('button', { name: /create race/i }).closest('form').noValidate = true;
  await userEvent.type(screen.getByLabelText('Target level'), '80');
  await userEvent.click(screen.getByRole('button', { name: /create race/i }));

  expect(screen.getByText('Roinrin is already level 81 in Thieving. Pick a higher level.')).toBeInTheDocument();
  expect(createRace).not.toHaveBeenCalled();
});

test('says so, and saves nothing, when the current XP cannot be found', async () => {
  fetchFreshPlayerStats.mockRejectedValue(new Error('WiseOldMan is down'));
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await typeTitle();
  await userEvent.click(screen.getByText('pick thieving'));

  expect(await screen.findByText('Could not get current XP. Use XP Gain instead.')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Target level'), '85');
  await userEvent.click(screen.getByRole('button', { name: /create race/i }));
  expect(screen.getByText("Could not get Roinrin's current XP. Set an XP gain instead.")).toBeInTheDocument();
  expect(createRace).not.toHaveBeenCalled();
});

test('editing measures a level from the racer\'s recorded start, not their XP today', async () => {
  // Started at 2,000,000 (level 80) and has gained since; level 85 is
  // 1,258,594 XP from the start, whatever they have now.
  const race = {
    id: 'r9', title: 'Thieving race', description: '', public: false, end_date: null,
    participants: [{
      id: 'p1', wom_id: 1, player_name: 'Roinrin', metric: 'thieving',
      target_value: 500_000, start_value: 2_000_000, current_value: 200_000,
      baseline_set_at: '2026-11-01T00:00:00Z',
    }],
  };
  render(<CreateRace userId="u1" race={race} onCreated={vi.fn()} onCancel={vi.fn()} />);
  // A saved row opens on its XP gain.
  expect(screen.getByDisplayValue('500000')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Level' }));
  expect(screen.getByText('Level 80 now (2,000,000 XP).')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Target level'), '85');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  expect(fetchFreshPlayerStats).not.toHaveBeenCalled();
  expect(updateRace).toHaveBeenCalledWith(
    'r9',
    expect.objectContaining({ participants: [expect.objectContaining({ id: 'p1', target_value: 1_258_594 })] })
  );
});

test('offers no level target for overall', async () => {
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
  await userEvent.click(screen.getByText('pick overall'));
  expect(screen.queryByRole('button', { name: 'Level' })).not.toBeInTheDocument();
  expect(screen.getByText('XP to Gain')).toBeInTheDocument();
});
