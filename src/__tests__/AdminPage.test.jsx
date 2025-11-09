import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPage from '../pages/AdminPage';

// Mock data
const mockMember = {
  wom_id: 123,
  name: 'TestPlayer',
  wom_name: 'testplayer',
  womrole: 'Member',
  current_lvl: 126,
  ehb: 100,
  siege_score: 500,
  hidden: false,
  runewatch_reported: false,
  runewatch_whitelisted: false,
};

let mockIsAdmin = true;
let mockIsAuthenticated = true;
let mockMembers = [];
let mockMembersLoading = false;
let mockMembersError = null;

// Mock hooks
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: mockIsAdmin,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

vi.mock('../context/DataContext', () => ({
  useData: () => ({
    members: mockMembers,
    loading: mockMembersLoading,
    error: mockMembersError,
    refreshMembers: vi.fn(),
    updateMember: vi.fn().mockResolvedValue({}),
    deleteMember: vi.fn().mockResolvedValue({}),
  }),
}));

// Mock components
vi.mock('../components/admin/AdminMemberTable', () => ({
  default: ({ members, onEditClick, onDeleteClick }) => (
    <div data-testid="admin-member-table">
      {members.length === 0 ? (
        <div>No members to display</div>
      ) : (
        members.map((member) => (
          <div key={member.wom_id} data-testid={`member-${member.wom_id}`}>
            {member.name}
            <button onClick={() => onEditClick(member)}>Edit</button>
            <button onClick={() => onDeleteClick(member)}>Delete</button>
          </div>
        ))
      )}
    </div>
  ),
}));

vi.mock('../components/admin/AdminUserManager', () => ({
  default: () => <div data-testid="admin-user-manager">User Manager Component</div>,
}));

vi.mock('../components/ClaimRequestManager', () => ({
  default: () => <div data-testid="claim-request-manager">Claim Request Manager Component</div>,
}));

vi.mock('../components/RankAlerts', () => ({
  default: () => <div data-testid="rank-alerts">Rank Alerts Component</div>,
}));

vi.mock('../components/RunewatchAlerts', () => ({
  default: () => <div data-testid="runewatch-alerts">Runewatch Alerts Component</div>,
}));

vi.mock('../components/MemberEditor', () => ({
  default: ({ member, onSave, onCancel }) => (
    <div data-testid="member-editor">
      <div>{member ? 'Edit Member' : 'Add New Member'}</div>
      <button onClick={() => onSave({ ...member, name: 'Updated' })}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../utils/rankUtils', () => ({
  memberNeedsRankUpdate: () => false,
}));

describe('AdminPage - Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockIsAdmin = true;
    mockIsAuthenticated = true;
    mockMembers = [];
    mockMembersLoading = false;
    mockMembersError = null;
  });

  describe('Not Admin State', () => {
    it('shows access restricted when user is not admin', () => {
      mockIsAdmin = false;

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText('You must be logged in as an administrator to view this page.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });
  });

  describe('Empty Members State', () => {
    it('renders admin page with no members', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Should still show the member table component even with no data
      expect(screen.getByTestId('admin-member-table')).toBeInTheDocument();
      expect(screen.getByText('No members to display')).toBeInTheDocument();
    });

    it('shows error notification when trying to export CSV with no members', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Click export CSV button
      const exportButton = screen.getByRole('button', { name: /export members to csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('No members to export')).toBeInTheDocument();
      });
    });

    it('shows error notification when trying to reset scores with no members', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Click reset scores button
      const resetButton = screen.getByRole('button', { name: /reset all siege scores/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        // Modal should open - check for the warning message instead
        expect(screen.getByText(/This action will set all members' siege scores to 0/)).toBeInTheDocument();
      });

      // Type confirmation text
      const confirmInput = screen.getByPlaceholderText('RESET ALL SCORES');
      fireEvent.change(confirmInput, { target: { value: 'RESET ALL SCORES' } });

      // Click confirm button in modal
      const confirmButton = screen.getByRole('button', { name: /reset all scores/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('No members to reset scores for')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while members are loading', async () => {
      mockIsAdmin = true;
      mockMembersLoading = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading members data...')).toBeInTheDocument();
      });

      expect(screen.getByText('Clan Administration')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when members fail to load', async () => {
      mockIsAdmin = true;
      mockMembersError = new Error('Failed to fetch members');

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch members/i)).toBeInTheDocument();
      });
    });

    it('handles error object without message property', async () => {
      mockIsAdmin = true;
      mockMembersError = 'Network error';

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('With Members State', () => {
    it('renders admin page with members', async () => {
      mockIsAdmin = true;
      mockMembers = [mockMember];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      expect(screen.getByTestId('member-123')).toBeInTheDocument();
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('renders search input for filtering members', async () => {
      mockIsAdmin = true;
      mockMembers = [
        mockMember,
        { ...mockMember, wom_id: 456, name: 'AnotherPlayer' },
      ];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('TestPlayer')).toBeInTheDocument();
        expect(screen.getByText('AnotherPlayer')).toBeInTheDocument();
      });

      // Search input should be present
      const searchInput = screen.getByPlaceholderText(/search members/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows alerts tab content', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Click alerts tab
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);

      await waitFor(() => {
        expect(screen.getByText('Action Items Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByTestId('rank-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('runewatch-alerts')).toBeInTheDocument();
    });

    it('shows claim requests tab content', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Click claim requests tab
      const claimRequestsTab = screen.getByText('Claim Requests');
      fireEvent.click(claimRequestsTab);

      await waitFor(() => {
        expect(screen.getByTestId('claim-request-manager')).toBeInTheDocument();
      });
    });

    it('shows user management tab content', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clan Administration')).toBeInTheDocument();
      });

      // Click user management tab
      const userManagementTab = screen.getByText('User Management');
      fireEvent.click(userManagementTab);

      await waitFor(() => {
        expect(screen.getByTestId('admin-user-manager')).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameters', () => {
    it('loads with tab from URL parameter', async () => {
      mockIsAdmin = true;
      mockMembers = [];

      render(
        <MemoryRouter initialEntries={['/admin?tab=alerts']}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Action Items Dashboard')).toBeInTheDocument();
      });
    });

    it('loads with search term from URL parameter', async () => {
      mockIsAdmin = true;
      mockMembers = [
        mockMember,
        { ...mockMember, wom_id: 456, name: 'AnotherPlayer' },
      ];

      render(
        <MemoryRouter initialEntries={['/admin?search=test']}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('test')).toBeInTheDocument();
      });
    });
  });
});
