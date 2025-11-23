/**
 * Integration tests for member claim flows
 *
 * These tests verify the complete flows for:
 * 1. Admin approving claim requests
 * 2. Admin generating claim codes
 * 3. Users redeeming claim codes
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Components to test
import ClaimRequestManager from '../components/ClaimRequestManager';
import GenerateClaimCode from '../components/GenerateClaimCode';
import ClaimPlayer from '../components/ClaimPlayer';

// Mock hooks and clients
vi.mock('../hooks/useClaimRequests');
vi.mock('../hooks/useMembers');
vi.mock('../context/AuthContext');
vi.mock('../supabaseClient');

describe('Claim Request Approval Flow', () => {
  let mockProcessRequest;
  let mockRefresh;

  beforeEach(async () => {
    mockProcessRequest = vi.fn().mockResolvedValue(true);
    mockRefresh = vi.fn();

    const { useClaimRequests } = await import('../hooks/useClaimRequests');
    useClaimRequests.mockReturnValue({
      requests: [
        {
          id: 1,
          rsn: 'TestPlayer',
          status: 'pending',
          username: 'testuser',
          created_at: new Date().toISOString(),
          user_id: 'f0103c79-d808-4ddd-8352-107932667e9',
          wom_id: 12345,
          message: 'Please approve my claim'
        }
      ],
      loading: false,
      error: null,
      refresh: mockRefresh,
      processRequest: mockProcessRequest,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully approve a claim request', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimRequestManager />
      </MemoryRouter>
    );

    // Find and click the Approve button - use more specific query to avoid filter buttons
    const approveButtons = await screen.findAllByRole('button', { name: /approve/i });
    const approveButton = approveButtons.find(btn => btn.classList.contains('ui-action-button'));
    await user.click(approveButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Approve Request/i)).toBeInTheDocument();
    });

    // Confirm approval
    const confirmButton = screen.getByRole('button', { name: /Approve Request/i });
    await user.click(confirmButton);

    // Verify edge function was called
    await waitFor(() => {
      expect(mockProcessRequest).toHaveBeenCalledWith(
        1, // requestId
        'approved',
        '', // admin notes (empty by default)
        'f0103c79-d808-4ddd-8352-107932667e9', // userId
        12345 // womId
      );
    });

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
    });
  });

  it('should successfully deny a claim request with notes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimRequestManager />
      </MemoryRouter>
    );

    // Find and click the Deny button - use more specific query
    const denyButtons = await screen.findAllByRole('button', { name: /deny/i });
    const denyButton = denyButtons.find(btn => btn.classList.contains('ui-action-button'));
    await user.click(denyButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Deny Request/i)).toBeInTheDocument();
    });

    // Add admin notes
    const notesTextarea = screen.getByPlaceholderText(/Add notes about your decision/i);
    await user.type(notesTextarea, 'Need more verification');

    // Confirm denial
    const confirmButton = screen.getByRole('button', { name: /Deny Request/i });
    await user.click(confirmButton);

    // Verify edge function was called with notes
    await waitFor(() => {
      expect(mockProcessRequest).toHaveBeenCalledWith(
        1,
        'denied',
        'Need more verification',
        'f0103c79-d808-4ddd-8352-107932667e9',
        12345
      );
    });
  });

  it('should handle approval errors gracefully', async () => {
    mockProcessRequest.mockRejectedValue(new Error('Database error'));

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimRequestManager />
      </MemoryRouter>
    );

    const approveButtons = await screen.findAllByRole('button', { name: /approve/i });
    const approveButton = approveButtons.find(btn => btn.classList.contains('ui-action-button'));
    await user.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/Approve Request/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Approve Request/i });
    await user.click(confirmButton);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to process request/i)).toBeInTheDocument();
    });
  });
});

describe('Claim Code Generation Flow', () => {
  let mockMembers;
  let mockSupabase;

  beforeEach(async () => {
    mockMembers = [
      { wom_id: 12345, name: 'TestPlayer1', claimed_by: null },
      { wom_id: 67890, name: 'TestPlayer2', claimed_by: null }
    ];

    const { useMembers } = await import('../hooks/useMembers');
    useMembers.mockReturnValue({
      members: mockMembers,
      loading: false,
      error: null
    });

    // Mock Supabase client with proper method chaining
    const { supabase } = await import('../supabaseClient');
    const mockSelect = vi.fn().mockResolvedValue({
      data: [{ claim_code: 'ABC12345' }],
      error: null
    });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect
      }),
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect
    };

    // Apply the mock
    Object.assign(supabase, mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a claim code for unclaimed member', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <GenerateClaimCode />
      </MemoryRouter>
    );

    // Select a player
    const dropdown = await screen.findByRole('combobox');
    await user.selectOptions(dropdown, '12345');

    // Click generate button
    const generateButton = screen.getByRole('button', { name: /Generate Claim Code/i });
    await user.click(generateButton);

    // Verify Supabase was called to update members table
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('members');
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('wom_id', 12345);
    });

    // Verify success message and code display
    await waitFor(() => {
      expect(screen.getByText(/Claim code generated successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/Generated Code:/i)).toBeInTheDocument();
    });
  });

  it('should handle generation errors', async () => {
    mockSupabase.select.mockResolvedValue({
      data: null,
      error: { message: 'RLS policy violation' }
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <GenerateClaimCode />
      </MemoryRouter>
    );

    const dropdown = await screen.findByRole('combobox');
    await user.selectOptions(dropdown, '12345');

    const generateButton = screen.getByRole('button', { name: /Generate Claim Code/i });
    await user.click(generateButton);

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate claim code/i)).toBeInTheDocument();
    });
  });
});

describe('Claim Code Redemption Flow', () => {
  let mockClaimPlayer;
  let mockUser;

  beforeEach(async () => {
    mockUser = {
      id: 'f0103c79-d808-4ddd-8352-107932667e9',
      username: 'testuser'
    };

    mockClaimPlayer = vi.fn().mockResolvedValue({
      success: true,
      message: 'Successfully claimed player: TestPlayer',
      player: { name: 'TestPlayer' }
    });

    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      user: mockUser,
      claimPlayer: mockClaimPlayer
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully redeem a valid claim code', async () => {
    const user = userEvent.setup();

    const mockOnRequestSubmitted = vi.fn();

    render(
      <MemoryRouter>
        <ClaimPlayer onRequestSubmitted={mockOnRequestSubmitted} />
      </MemoryRouter>
    );

    // Enter claim code
    const codeInput = await screen.findByPlaceholderText(/Enter your claim code/i);
    await user.type(codeInput, 'ABC12345');

    // Submit - get the submit button specifically (not the tab button)
    const submitButton = screen.getByRole('button', { name: /claim player/i });
    await user.click(submitButton);

    // Verify edge function was called
    await waitFor(() => {
      expect(mockClaimPlayer).toHaveBeenCalledWith('ABC12345');
    });

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/Successfully claimed player/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid claim codes', async () => {
    mockClaimPlayer.mockResolvedValue({
      error: 'Invalid or already used claim code'
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimPlayer onRequestSubmitted={vi.fn()} />
      </MemoryRouter>
    );

    const codeInput = await screen.findByPlaceholderText(/Enter your claim code/i);
    await user.type(codeInput, 'INVALID');

    const submitButton = screen.getByRole('button', { name: /claim player/i });
    await user.click(submitButton);

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Invalid or already used claim code/i)).toBeInTheDocument();
    });
  });

  it('should handle already claimed members', async () => {
    mockClaimPlayer.mockResolvedValue({
      error: 'This player has already been claimed'
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimPlayer onRequestSubmitted={vi.fn()} />
      </MemoryRouter>
    );

    const codeInput = await screen.findByPlaceholderText(/Enter your claim code/i);
    await user.type(codeInput, 'ABC12345');

    const submitButton = screen.getByRole('button', { name: /claim player/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/already been claimed/i)).toBeInTheDocument();
    });
  });

  it('should require user to be logged in', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      claimPlayer: mockClaimPlayer
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClaimPlayer onRequestSubmitted={vi.fn()} />
      </MemoryRouter>
    );

    const codeInput = await screen.findByPlaceholderText(/Enter your claim code/i);
    await user.type(codeInput, 'ABC12345');

    const submitButton = screen.getByRole('button', { name: /claim player/i });
    await user.click(submitButton);

    // Should show login required message
    await waitFor(() => {
      expect(screen.getByText(/must be logged in/i)).toBeInTheDocument();
    });
  });
});

describe('End-to-End Claim Flow', () => {
  it('should complete full claim approval flow', async () => {
    // This would test:
    // 1. User submits claim request
    // 2. Admin approves request
    // 3. User sees claimed member in profile
    // This requires more complex setup with routing and state management
    // TODO: Implement full E2E test
  });

  it('should complete full claim code flow', async () => {
    // This would test:
    // 1. Admin generates claim code
    // 2. User redeems code
    // 3. User sees claimed member in profile
    // TODO: Implement full E2E test
  });
});
