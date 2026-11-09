import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

const createClaimRequest = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../hooks/useClaimRequests', () => ({
  useClaimRequests: () => ({
    requests: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    createClaimRequest,
  }),
}));
vi.mock('../hooks/useMembers', () => ({
  useMembers: () => ({
    members: [{ wom_id: 7, name: 'Roinrin' }],
    loading: false,
    error: null,
    refreshMembers: vi.fn(),
  }),
}));

import ClaimPlayer from '../components/ClaimPlayer';

// Braces matter: a function returned from beforeEach is run as a cleanup hook.
beforeEach(() => {
  createClaimRequest.mockReset();
});

const submitFor = async (name) => {
  render(<ClaimPlayer />);
  await userEvent.selectOptions(screen.getByRole('combobox'), name);
  await userEvent.click(screen.getByRole('button', { name: /submit request/i }));
};

test('has no claim code tab and opens on the request form', () => {
  // Nothing can create claim codes, so offering to redeem one was a dead end.
  render(<ClaimPlayer />);
  expect(screen.queryByText(/claim code/i)).toBeNull();
  expect(screen.getByRole('heading', { name: /search for your osrs account/i })).toBeInTheDocument();
});

test('shows a confirmation after submitting a request', async () => {
  // Regression: the success message only rendered inside the old code tab,
  // so a request from this tab gave no feedback at all.
  createClaimRequest.mockResolvedValue({});
  await submitFor('Roinrin');

  expect(createClaimRequest).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', wom_id: 7, rsn: 'Roinrin' })
  );
  expect(await screen.findByRole('status')).toHaveTextContent('Your claim request has been submitted');
});

test('shows the error when a request fails', async () => {
  createClaimRequest.mockRejectedValue(new Error('already requested'));
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  await submitFor('Roinrin');

  expect(await screen.findByRole('alert')).toHaveTextContent('Request failed: already requested');
  errorLog.mockRestore();
});
