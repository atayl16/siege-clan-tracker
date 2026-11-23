import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const createClaimRequest = vi.fn();
let mockRequests = [];
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../hooks/useClaimRequests', () => ({
  useClaimRequests: () => ({
    requests: mockRequests,
    loading: false,
    error: null,
    refresh: vi.fn(),
    createClaimRequest,
  }),
}));
vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({
    members: [{ wom_id: 7, name: 'Moonfern' }],
    loading: false,
    error: null,
    refreshMembers: vi.fn(),
  }),
}));

import ClaimPlayer from '../components/ClaimPlayer';

// Braces matter: a function returned from beforeEach is run as a cleanup hook.
beforeEach(() => {
  createClaimRequest.mockReset();
  mockRequests = [];
});

const submitFor = async (name) => {
  render(<ClaimPlayer />);
  await userEvent.selectOptions(screen.getByRole('combobox'), name);
  await userEvent.click(screen.getByRole('button', { name: /submit request/i }));
};

test('has no claim code option and no tabs, just the claim form', () => {
  // Nothing can create claim codes, so offering to redeem one was a dead end.
  render(<ClaimPlayer />);
  expect(screen.queryByText(/claim code/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /view my requests/i })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Claim a character' })).toBeInTheDocument();
  // No requests yet: nothing about them, rather than an empty panel.
  expect(screen.queryByRole('heading', { name: 'Your requests' })).toBeNull();
});

test('lists your requests above the form when there are any', () => {
  mockRequests = [{ id: 1, rsn: 'Moonfern', status: 'pending', created_at: '2026-11-20T10:00:00Z' }];
  render(<ClaimPlayer />);
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Your requests', 'Claim another character']);
  expect(screen.getByText('Waiting for a staff member to approve it.')).toBeInTheDocument();
});

test('shows a confirmation after submitting a request', async () => {
  // Regression: the success message only rendered inside the old code tab,
  // so a request from this tab gave no feedback at all.
  createClaimRequest.mockResolvedValue({});
  await submitFor('Moonfern');

  expect(createClaimRequest).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', wom_id: 7, rsn: 'Moonfern' })
  );
  expect(await screen.findByRole('status')).toHaveTextContent('Claim sent. A staff member will review it');
});

test('shows the error when a request fails', async () => {
  createClaimRequest.mockRejectedValue(new Error('already requested'));
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  await submitFor('Moonfern');

  expect(await screen.findByRole('alert')).toHaveTextContent('Request failed: already requested');
  errorLog.mockRestore();
});
