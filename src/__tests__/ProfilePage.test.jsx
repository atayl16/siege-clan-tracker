import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../pages/ProfilePage';

// Mock hooks
const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  created_at: '2024-01-01T00:00:00Z',
};

const mockClaim = {
  id: 'claim-1',
  members: {
    wom_id: 123,
    name: 'TestPlayer',
    current_lvl: 126,
    ehb: 100,
    siege_score: 500,
  },
  claimed_at: '2024-01-15T00:00:00Z',
};

const mockRace = {
  id: 'race-1',
  creator_id: 'test-user-id',
  name: 'Test Race',
  metric: 'ehb',
  participants: [],
};

let mockUseAuth = vi.fn();
let mockUseRaces = vi.fn();

// Mock all dependencies
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../hooks/useRaces', () => ({
  useRaces: (userId) => mockUseRaces(userId),
}));

vi.mock('../services/goalProgressService', () => ({
  updatePlayerGoals: vi.fn().mockResolvedValue({}),
}));

vi.mock('../components/ClaimPlayer', () => ({
  default: () => <div data-testid="claim-player">Claim Player Component</div>,
}));

vi.mock('../components/goals/GoalsList', () => ({
  default: () => <div data-testid="goals-list">Goals List Component</div>,
}));

vi.mock('../components/goals/PlayerGoalSummary', () => ({
  default: () => <div data-testid="player-goal-summary">Goal Summary</div>,
}));

vi.mock('../components/RaceCard', () => ({
  default: ({ race }) => <div data-testid={`race-card-${race.id}`}>{race.name}</div>,
}));

vi.mock('../components/CreateRace', () => ({
  default: ({ onCancel }) => (
    <div data-testid="create-race">
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('ProfilePage - Empty States', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Not Logged In State', () => {
    it('shows login prompt when user is not authenticated', () => {
      mockUseAuth = vi.fn(() => ({
        user: null,
        userClaims: [],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Please Log In')).toBeInTheDocument();
      expect(screen.getByText('You need to be logged in to view your profile.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });
  });

  describe('Empty Characters State', () => {
    it('shows empty state when user has no claimed characters', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Characters Yet')).toBeInTheDocument();
      });

      expect(
        screen.getByText("You haven't claimed any characters yet. Click 'Claim New Character' to get started.")
      ).toBeInTheDocument();
    });

    it('shows empty state when userClaims is null', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: null,
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Characters Yet')).toBeInTheDocument();
      });
    });

    it('shows empty state when userClaims is undefined', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: undefined,
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Characters Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Goals State', () => {
    it('shows empty state in goals tab when user has no characters', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      // Click on Goals tab
      const goalsTab = await screen.findByText('Goals');
      goalsTab.click();

      await waitFor(() => {
        expect(screen.getByText('No Characters to Track')).toBeInTheDocument();
      });

      expect(
        screen.getByText('You need to claim a character before setting goals.')
      ).toBeInTheDocument();
    });
  });

  /* Hidden until edge function issue resolved
  describe('Empty Races State', () => {
    it('shows empty state when user has no races', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [mockClaim],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      // Click on Races tab
      const racesTab = await screen.findByText('Races');
      racesTab.click();

      await waitFor(() => {
        expect(screen.getByText('No Races Yet')).toBeInTheDocument();
      });

      expect(
        screen.getByText("Your characters aren't participating in any races yet.")
      ).toBeInTheDocument();

      // Should have create race button
      expect(screen.getByRole('button', { name: /create a race/i })).toBeInTheDocument();
    });

    it('shows empty state when activeRaces is null', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [mockClaim],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: null,
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      // Click on Races tab
      const racesTab = await screen.findByText('Races');
      racesTab.click();

      await waitFor(() => {
        expect(screen.getByText('No Races Yet')).toBeInTheDocument();
      });
    });
  });
  */

  describe('With Data States', () => {
    it('renders user profile with claimed characters', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [mockClaim],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Testuser')).toBeInTheDocument();
      });

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.getByText('Claimed')).toBeInTheDocument();
    });

    /* Hidden until edge function issue resolved
    it('renders user profile with active races', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [mockClaim],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [mockRace],
        loading: false,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      // Click on Races tab
      const racesTab = await screen.findByText('Races');
      racesTab.click();

      await waitFor(() => {
        expect(screen.getByTestId('race-card-race-1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Race')).toBeInTheDocument();
    });
    */
  });

  /* Hidden until edge function issue resolved
  describe('Loading States', () => {
    it('shows loading indicator while races are loading', async () => {
      mockUseAuth = vi.fn(() => ({
        user: mockUser,
        userClaims: [mockClaim],
        fetchUserClaims: vi.fn(),
      }));
      mockUseRaces = vi.fn(() => ({
        activeRaces: [],
        loading: true,
        refreshRaces: vi.fn(),
      }));

      render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      );

      // Click on Races tab
      const racesTab = await screen.findByText('Races');
      racesTab.click();

      await waitFor(() => {
        // LoadingIndicator component should be present
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });
  */
});
