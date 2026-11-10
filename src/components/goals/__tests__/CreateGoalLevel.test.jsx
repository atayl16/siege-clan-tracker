import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// 2,200,000 Thieving XP is level 81 (level 82 starts at 2,421,087).
const stats = {
  updated: true,
  latestSnapshot: {
    data: {
      skills: { thieving: { experience: 2_200_000 }, overall: { experience: 300_000_000 } },
      bosses: { zulrah: { kills: 250 } },
    },
  },
};

const createGoal = vi.fn();
vi.mock('../../../hooks/usePlayer', () => ({ usePlayer: () => ({ player: stats, loading: false }) }));
vi.mock('../../../hooks/useUserGoals', () => ({ useUserGoals: () => ({ createGoal, loading: false }) }));
vi.mock('../../../services/playerRefresh', () => ({ fetchFreshPlayerStats: async () => stats }));
vi.mock('../../MetricSelector', () => ({
  default: ({ onMetricChange, metricType }) => (
    <select aria-label="Metric" onChange={(e) => onMetricChange(e.target.value)} defaultValue="">
      <option value="">--</option>
      {metricType === 'skill' ? (
        <>
          <option value="thieving">Thieving</option>
          <option value="overall">Overall</option>
        </>
      ) : (
        <option value="zulrah">Zulrah</option>
      )}
    </select>
  ),
}));

import CreateGoal from '../CreateGoal';

beforeEach(() => {
  createGoal.mockReset();
  createGoal.mockResolvedValue({ id: 'g1' });
});

const renderForm = () =>
  render(
    <CreateGoal player={{ wom_id: 7, name: 'roinrin' }} userId="u1" onGoalCreated={vi.fn()} onCancel={vi.fn()} />
  );

test('sets a skill goal by level: 81 Thieving to 85', async () => {
  renderForm();
  await userEvent.selectOptions(screen.getByLabelText('Metric'), 'thieving');

  expect(await screen.findByText('Level 81')).toBeInTheDocument();
  const input = screen.getByLabelText('Target Level');
  expect(input).toHaveAttribute('min', '82');
  expect(input).toHaveAttribute('max', '99');

  await userEvent.type(input, '85');
  // 3,258,594 XP is level 85.
  expect(screen.getByText('3,258,594 XP (1,058,594 to go)')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
  expect(createGoal).toHaveBeenCalledWith(
    expect.objectContaining({
      goal_type: 'skill',
      metric: 'thieving',
      start_value: 2_200_000,
      current_value: 2_200_000,
      target_value: 3_258_594,
    })
  );
});

test('will not set a level the player already has', async () => {
  renderForm();
  await userEvent.selectOptions(screen.getByLabelText('Metric'), 'thieving');
  await screen.findByText('Level 81');

  await userEvent.type(screen.getByLabelText('Target Level'), '81');
  // Submit the form directly: the browser's own min check would stop a click.
  const form = screen.getByRole('button', { name: 'Create Goal' }).closest('form');
  form.noValidate = true;
  await userEvent.click(screen.getByRole('button', { name: 'Create Goal' }));

  expect(await screen.findByText(/already level 81 in Thieving/)).toBeInTheDocument();
  expect(createGoal).not.toHaveBeenCalled();
});

test('clears the number when switching between a level and an XP amount', async () => {
  renderForm();
  await userEvent.selectOptions(screen.getByLabelText('Metric'), 'thieving');
  await userEvent.type(screen.getByLabelText('Target Level'), '85');

  await userEvent.click(screen.getByText('Gain Amount'));
  expect(screen.getByLabelText('Amount to Gain')).toHaveValue(null);
});

test('offers no level option for overall or for bosses', async () => {
  renderForm();
  expect(screen.getByText('Reach Level')).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText('Metric'), 'overall');
  expect(screen.queryByText('Reach Level')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Amount to Gain')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Boss/ }));
  expect(screen.queryByText('Reach Level')).not.toBeInTheDocument();
});
