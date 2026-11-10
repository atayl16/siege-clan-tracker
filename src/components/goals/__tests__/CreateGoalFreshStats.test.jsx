import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// WOM's saved snapshot (usePlayer) says 100,000 sailing XP; the fresh
// hiscores say 150,000. The goal must start from the fresh number.
const saved = { latestSnapshot: { data: { skills: { sailing: { experience: 100_000 } } } } };
const fresh = { updated: true, latestSnapshot: { data: { skills: { sailing: { experience: 150_000 } } } } };

const createGoal = vi.fn();
vi.mock('../../../hooks/usePlayer', () => ({ usePlayer: () => ({ player: saved, loading: false }) }));
vi.mock('../../../hooks/useUserGoals', () => ({ useUserGoals: () => ({ createGoal, loading: false }) }));
vi.mock('../../../services/playerRefresh', () => ({ fetchFreshPlayerStats: vi.fn() }));
vi.mock('../../MetricSelector', () => ({
  default: ({ onMetricChange }) => (
    <select aria-label="Metric" onChange={(e) => onMetricChange(e.target.value)} defaultValue="">
      <option value="">--</option>
      <option value="sailing">Sailing</option>
    </select>
  ),
}));

import CreateGoal from '../CreateGoal';
import { fetchFreshPlayerStats } from '../../../services/playerRefresh';

beforeEach(() => {
  createGoal.mockReset();
  createGoal.mockResolvedValue({ id: 'g1' });
  fetchFreshPlayerStats.mockReset();
});

const renderForm = () =>
  render(
    <CreateGoal player={{ wom_id: 7, name: 'roinrin' }} userId="u1" onGoalCreated={vi.fn()} onCancel={vi.fn()} />
  );

async function fillGain(amount) {
  await userEvent.selectOptions(screen.getByLabelText('Metric'), 'sailing');
  // Skill goals open on Reach Level; these tests set an XP gain.
  await userEvent.click(screen.getByText('Gain Amount'));
  await userEvent.type(screen.getByRole('spinbutton'), String(amount));
}

test('starts the goal from fresh hiscores, not WOM\'s saved snapshot', async () => {
  fetchFreshPlayerStats.mockResolvedValue(fresh);
  renderForm();
  await fillGain(10_000);

  expect(await screen.findByText('150,000')).toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create Goal' }));

  expect(fetchFreshPlayerStats).toHaveBeenCalledWith(7);
  expect(createGoal).toHaveBeenCalledWith(
    expect.objectContaining({ start_value: 150_000, current_value: 150_000, target_value: 160_000 })
  );
});

test('will not create the goal until the fresh stats arrive', async () => {
  fetchFreshPlayerStats.mockReturnValue(new Promise(() => {}));
  renderForm();
  await fillGain(10_000);

  expect(screen.getByText(/getting your latest stats/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create Goal' })).toBeDisabled();
});

test('falls back to the saved snapshot, and says so, when fresh stats are unavailable', async () => {
  fetchFreshPlayerStats.mockImplementation(async () => {
    throw new Error('WiseOldMan is down');
  });
  renderForm();
  await fillGain(10_000);

  expect(await screen.findByText('100,000')).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent(/may be behind/i);
  await userEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
  expect(createGoal).toHaveBeenCalledWith(expect.objectContaining({ start_value: 100_000 }));
});
