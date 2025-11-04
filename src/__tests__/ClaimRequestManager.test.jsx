import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ClaimRequestManager from '../components/ClaimRequestManager';
import { vi } from 'vitest';

const mockUseClaimRequests = vi.fn();

vi.mock('../hooks/useClaimRequests', () => ({
  useClaimRequests: () => mockUseClaimRequests(),
}));

test('renders ClaimRequestManager without crashing (empty state)', () => {
  mockUseClaimRequests.mockReturnValue({
    requests: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    processRequest: vi.fn(),
  });

  render(
    <MemoryRouter>
      <ClaimRequestManager />
    </MemoryRouter>
  );
  expect(screen.getByText('No Requests Found')).toBeInTheDocument();
});

test('renders ClaimRequestManager and displays a claim request', async () => {
  mockUseClaimRequests.mockReturnValue({
    requests: [{
      id: 1,
      rsn: 'TestRSN',
      status: 'pending',
      username: 'testuser',
      created_at: new Date().toISOString(),
      user_id: 1
    }],
    loading: false,
    error: null,
    refresh: vi.fn(),
    processRequest: vi.fn(),
  });

  render(
    <MemoryRouter>
      <ClaimRequestManager />
    </MemoryRouter>
  );

  expect(await screen.findByText('TestRSN')).toBeInTheDocument();
  expect(screen.getByText(/pending/i)).toBeInTheDocument();
});
