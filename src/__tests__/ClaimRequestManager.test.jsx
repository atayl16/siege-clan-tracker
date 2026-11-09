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
  // Use getAllByText since there may be multiple elements with "pending"
  expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
});

test('Approve opens the confirm dialog and sends the request', async () => {
  // Regression: the dialog never passed isOpen to Modal, which returns null
  // without it, so clicking Approve did nothing at all.
  const processRequest = vi.fn().mockResolvedValue({ success: true });
  mockUseClaimRequests.mockReturnValue({
    requests: [{
      id: 7,
      rsn: 'ysihysi',
      status: 'pending',
      username: 'ysihysi',
      created_at: new Date().toISOString(),
      user_id: 'u-7',
      wom_id: 4242,
    }],
    loading: false,
    error: null,
    refresh: vi.fn(),
    processRequest,
  });

  render(
    <MemoryRouter>
      <ClaimRequestManager />
    </MemoryRouter>
  );

  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  const confirm = await screen.findByRole('button', { name: 'Approve Request' });
  await userEvent.click(confirm);

  expect(processRequest).toHaveBeenCalledWith(7, 'approved', '', 'u-7', 4242);
});
