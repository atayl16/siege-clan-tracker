import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ClaimRequestManager from '../components/ClaimRequestManager';
import { vi } from 'vitest';

let mockRequests = [];

vi.mock('../hooks/useClaimRequests', () => ({
  useClaimRequests: () => ({
    requests: mockRequests,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  mockRequests = [];
});

test('renders ClaimRequestManager without crashing (empty state)', () => {
  mockRequests = [];
  render(
    <MemoryRouter>
      <ClaimRequestManager />
    </MemoryRouter>
  );
  expect(screen.getByText('No Requests Found')).toBeInTheDocument();
});

test('renders ClaimRequestManager and displays a claim request', async () => {
  mockRequests = [{ id: 1, rsn: 'TestRSN', status: 'pending' }];
  render(
    <MemoryRouter>
      <ClaimRequestManager />
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: /pending/i }));
  expect(await screen.findByText('TestRSN')).toBeInTheDocument();
  expect(screen.getByText(/pending/i)).toBeInTheDocument();
}); 
