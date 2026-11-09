import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import MetricSelector from '../components/MetricSelector';

vi.mock('../hooks/useMetrics', () => ({
  useMetrics: () => ({
    loading: false,
    metrics: [
      { metric: 'runecrafting', name: 'runecrafting', type: 'skill' },
      { metric: 'chambers_of_xeric', name: 'chambers_of_xeric', type: 'boss' },
    ],
  }),
}));

test('shows WOM metric keys as capitalized names but keeps the raw value', () => {
  render(<MetricSelector playerId={1} metricType="skill" selectedMetric="" onMetricChange={() => {}} />);

  const rc = screen.getByRole('option', { name: 'Runecrafting' });
  expect(rc).toHaveValue('runecrafting');
  expect(screen.getByRole('option', { name: 'Chambers Of Xeric' })).toHaveValue('chambers_of_xeric');
});
