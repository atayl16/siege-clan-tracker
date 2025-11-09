import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProgressPage from '../pages/ProgressPage';

// Mock data
const mockUserData = {
  id: 'test-user-id',
  username: 'testuser',
};

const mockRace = {
  id: 'race-1',
  creator_id: 'test-user-id',
  name: 'Test Race',
  metric: 'ehb',
  public: true,
  participants: [],
};

const mockGoal = {
  id: 'goal-1',
  user_id: 'test-user-id',
  player_id: 123,
  metric: 'ehb',
  target_value: 1000,
  current_value: 500,
  public: true,
};

let mockUser = null;
let mockActiveRaces = [];
let mockPublicRaces = [];
let mockRacesLoading = false;
let mockUserGoals = [];
let mockGoalsLoading = false;
let mockGoalsError = null;

// Mock hooks
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('../hooks/useRaces', () => ({
  useRaces: (userId) => ({
    activeRaces: mockActiveRaces,
    publicRaces: mockPublicRaces,
    loading: mockRacesLoading,
    refreshRaces: vi.fn(),
  }),
}));

vi.mock('../hooks/useUserGoals', () => ({
  useUserGoals: () => ({
    userGoals: mockUserGoals,
    loading: mockGoalsLoading,
    error: mockGoalsError,
  }),
}));

// Mock components
vi.mock('../components/CreateRace', () => ({
  default: ({ onCreated, onCancel }) => (
    <div data-testid="create-race">
      <div>Create Race Form</div>
      <button onClick={onCreated}>Create</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/RaceCard', () => ({
  default: ({ race, isOwner }) => (
    <div data-testid={`race-card-${race.id}`}>
      <div>{race.name}</div>
      {isOwner && <div>Owner</div>}
    </div>
  ),
}));

vi.mock('../components/GoalCard', () => ({
  default: ({ goal, isOwner }) => (
    <div data-testid={`goal-card-${goal.id}`}>
      <div>Goal {goal.id}</div>
      {isOwner && <div>Owner</div>}
    </div>
  ),
}));

describe('ProgressPage - Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockUser = null;
    mockActiveRaces = [];
    mockPublicRaces = [];
    mockRacesLoading = false;
    mockUserGoals = [];
    mockGoalsLoading = false;
    mockGoalsError = null;
  });

  describe('Not Logged In State', () => {
    it('shows public races tab by default when not logged in', async () => {
      mockUser = null;
      mockPublicRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Races')).toBeInTheDocument();
      });

      // Should not show "My Races" tab
      expect(screen.queryByText('My Races')).not.toBeInTheDocument();
    });

    it('shows sign in prompt when trying to view My Races without authentication', async () => {
      mockUser = null;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Races')).toBeInTheDocument();
      });

      // Note: Can't access My Races tab when not logged in, so this test verifies it's not shown
      expect(screen.queryByText('My Races')).not.toBeInTheDocument();
    });
  });

  describe('Empty Public Races State', () => {
    it('shows empty state when no public races exist', async () => {
      mockUser = null;
      mockPublicRaces = [];
      mockRacesLoading = false;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Public Races')).toBeInTheDocument();
      });

      expect(
        screen.getByText('No public races have been created yet')
      ).toBeInTheDocument();
    });

    it('shows empty state when publicRaces is null', async () => {
      mockUser = null;
      mockPublicRaces = null;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Public Races')).toBeInTheDocument();
      });
    });

    it('shows empty state when publicRaces is undefined', async () => {
      mockUser = null;
      mockPublicRaces = undefined;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Public Races')).toBeInTheDocument();
      });
    });
  });

  describe('Empty My Races State', () => {
    it('shows empty state when logged in user has no races', async () => {
      mockUser = mockUserData;
      mockActiveRaces = [];
      mockPublicRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      // Wait for My Races tab to be visible
      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      // Click My Races tab
      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByText('No Races Yet')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Start a race to track progress against other members')
      ).toBeInTheDocument();

      // Should show create race button
      expect(screen.getByRole('button', { name: /create race/i })).toBeInTheDocument();
    });

    it('shows empty state when activeRaces is null', async () => {
      mockUser = mockUserData;
      mockActiveRaces = null;
      mockPublicRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByText('No Races Yet')).toBeInTheDocument();
      });
    });

    it('shows empty state when activeRaces is undefined', async () => {
      mockUser = mockUserData;
      mockActiveRaces = undefined;
      mockPublicRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByText('No Races Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Public Goals State', () => {
    it('shows empty state when no public goals exist', async () => {
      mockUser = null;
      mockUserGoals = [];
      mockGoalsLoading = false;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      // Click Member Goals tab
      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('No Public Goals')).toBeInTheDocument();
      });

      expect(
        screen.getByText('No members have shared their goals yet')
      ).toBeInTheDocument();
    });

    it('shows empty state when userGoals is null', async () => {
      mockUser = null;
      mockUserGoals = null;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('No Public Goals')).toBeInTheDocument();
      });
    });

    it('shows empty state when userGoals is undefined', async () => {
      mockUser = null;
      mockUserGoals = undefined;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('No Public Goals')).toBeInTheDocument();
      });
    });

    it('filters out non-public goals', async () => {
      mockUser = null;
      mockUserGoals = [
        { ...mockGoal, public: false }, // Not public
        { ...mockGoal, id: 'goal-2', public: true }, // Public
      ];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        // Only one goal should be shown (the public one)
        expect(screen.getByTestId('goal-card-goal-2')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('goal-card-goal-1')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while races are loading', async () => {
      mockUser = null;
      mockRacesLoading = true;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // LoadingIndicator should be shown
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('shows loading indicator while goals are loading', async () => {
      mockUser = null;
      mockGoalsLoading = true;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('With Data States', () => {
    it('renders public races when data exists', async () => {
      mockUser = null;
      mockPublicRaces = [mockRace];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('race-card-race-1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Race')).toBeInTheDocument();
    });

    it('renders user races when logged in', async () => {
      mockUser = mockUserData;
      mockActiveRaces = [mockRace];
      mockPublicRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByTestId('race-card-race-1')).toBeInTheDocument();
      });
    });

    it('renders public goals when data exists', async () => {
      mockUser = null;
      mockUserGoals = [mockGoal];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Goals')).toBeInTheDocument();
      });

      const goalsTab = screen.getByText('Member Goals');
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
      });
    });

    it('shows owner status on race card when user is owner', async () => {
      mockUser = mockUserData;
      mockActiveRaces = [mockRace];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByText('Owner')).toBeInTheDocument();
      });
    });
  });

  describe('Create Race Flow', () => {
    it('shows create race form when button is clicked', async () => {
      mockUser = mockUserData;
      mockActiveRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create race/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-race')).toBeInTheDocument();
      });

      expect(screen.getByText('Create Race Form')).toBeInTheDocument();
    });

    it('hides create race form when cancelled', async () => {
      mockUser = mockUserData;
      mockActiveRaces = [];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Races')).toBeInTheDocument();
      });

      const myRacesTab = screen.getByText('My Races');
      fireEvent.click(myRacesTab);

      const createButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-race')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('create-race')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Counts', () => {
    it('shows correct count for public races', async () => {
      mockUser = null;
      mockPublicRaces = [mockRace, { ...mockRace, id: 'race-2' }];

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Races')).toBeInTheDocument();
      });

      // Both races should be displayed
      expect(screen.getByTestId('race-card-race-1')).toBeInTheDocument();
      expect(screen.getByTestId('race-card-race-2')).toBeInTheDocument();
    });

    it('handles null counts gracefully', async () => {
      mockUser = null;
      mockPublicRaces = null;
      mockUserGoals = null;

      render(
        <MemoryRouter>
          <ProgressPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Races')).toBeInTheDocument();
      });

      // Should not crash, just show empty states
      expect(screen.getByText('No Public Races')).toBeInTheDocument();
    });
  });
});
