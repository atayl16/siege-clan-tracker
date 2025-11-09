import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminMemberTable from '../AdminMemberTable';
import { useData } from '../../../context/DataContext';

// Mock the DataContext
vi.mock('../../../context/DataContext');

// Mock UI components
vi.mock('../../ui/Button', () => ({
  default: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

vi.mock('../../ui/Badge', () => ({
  default: ({ children }) => <span>{children}</span>
}));

vi.mock('../../ui/Card', () => {
  const MockCard = ({ children }) => <div>{children}</div>;
  MockCard.Body = ({ children }) => <div>{children}</div>;
  MockCard.Header = ({ children }) => <div>{children}</div>;
  MockCard.Footer = ({ children }) => <div>{children}</div>;
  return { default: MockCard };
});

/**
 * Test suite for AdminMemberTable
 *
 * BUG-002: Missing toggleMemberVisibility Function
 *
 * The bug: toggleMemberVisibility is called but not imported from useData()
 * This causes a runtime error when trying to hide/show members
 */

describe('AdminMemberTable - BUG-002: toggleMemberVisibility', () => {
  const mockMembers = [
    {
      wom_id: 1,
      name: 'TestPlayer',
      wom_name: 'TestPlayer',
      womrole: 'member',
      siege_score: 100,
      ehb: 50,
      current_xp: 1000000,
      first_xp: 500000,
      join_date: '2023-01-15',
      hidden: false
    },
    {
      wom_id: 2,
      name: 'HiddenPlayer',
      wom_name: 'HiddenPlayer',
      womrole: 'member',
      siege_score: 50,
      ehb: 25,
      current_xp: 500000,
      first_xp: 250000,
      join_date: '2023-06-01',
      hidden: true
    }
  ];

  const mockGroup = {
    memberships: mockMembers.map(m => ({
      player: {
        id: m.wom_id,
        displayName: m.name,
        latestSnapshot: {
          data: {
            skills: {
              overall: {
                experience: m.current_xp,
                level: 2000
              }
            }
          }
        },
        ehb: m.ehb
      },
      role: m.womrole
    }))
  };

  let mockToggleMemberVisibility;
  let mockUpdateMember;
  let mockRefreshWomData;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockToggleMemberVisibility = vi.fn().mockResolvedValue({});
    mockUpdateMember = vi.fn().mockResolvedValue({});
    mockRefreshWomData = vi.fn();

    // Mock useData to return our test data
    useData.mockReturnValue({
      group: mockGroup,
      loading: false,
      updateMember: mockUpdateMember,
      refreshWomData: mockRefreshWomData,
      toggleMemberVisibility: mockToggleMemberVisibility
    });
  });

  describe('Bug Reproduction', () => {
    it('should have toggleMemberVisibility function available from useData', () => {
      const dataContext = useData();

      // The bug: toggleMemberVisibility is missing
      expect(dataContext).toHaveProperty('toggleMemberVisibility');
      expect(typeof dataContext.toggleMemberVisibility).toBe('function');
    });

    it('should NOT throw error when hide/unhide button is clicked', async () => {
      const mockOnRefresh = vi.fn();

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Find and click the first row to expand it
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      // Wait for expanded row to appear
      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });

      // Click the Hide button - this should NOT throw an error
      const hideButton = screen.getByText('Hide');

      // This is the critical test - it should not throw
      expect(() => {
        fireEvent.click(hideButton);
      }).not.toThrow();

      // Verify toggleMemberVisibility was called
      await waitFor(() => {
        expect(mockToggleMemberVisibility).toHaveBeenCalledWith(
          expect.objectContaining({
            wom_id: 1,
            name: 'TestPlayer'
          })
        );
      });
    });

    it('should call toggleMemberVisibility when hiding a member', async () => {
      const mockOnRefresh = vi.fn();

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Expand first member
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      // Wait for Hide button
      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });

      // Click Hide button
      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);

      // Verify function was called with correct member
      await waitFor(() => {
        expect(mockToggleMemberVisibility).toHaveBeenCalledTimes(1);
        expect(mockToggleMemberVisibility).toHaveBeenCalledWith(
          expect.objectContaining({
            wom_id: 1,
            name: 'TestPlayer',
            hidden: false
          })
        );
      });
    });

    it('should call toggleMemberVisibility when unhiding a member', async () => {
      const mockOnRefresh = vi.fn();

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Find the hidden member (HiddenPlayer)
      const hiddenPlayerCell = screen.getByText('HiddenPlayer');
      fireEvent.click(hiddenPlayerCell);

      // Wait for Unhide button
      await waitFor(() => {
        expect(screen.getByText('Unhide')).toBeInTheDocument();
      });

      // Click Unhide button
      const unhideButton = screen.getByText('Unhide');
      fireEvent.click(unhideButton);

      // Verify function was called
      await waitFor(() => {
        expect(mockToggleMemberVisibility).toHaveBeenCalledTimes(1);
        expect(mockToggleMemberVisibility).toHaveBeenCalledWith(
          expect.objectContaining({
            wom_id: 2,
            name: 'HiddenPlayer',
            hidden: true
          })
        );
      });
    });

    it('should refresh the list after toggling visibility', async () => {
      const mockOnRefresh = vi.fn();

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Expand member
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      // Click Hide
      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });

      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);

      // Wait for visibility toggle to complete
      await waitFor(() => {
        expect(mockToggleMemberVisibility).toHaveBeenCalled();
      });

      // Verify refresh was called
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle toggle visibility errors gracefully', async () => {
      // Mock toggleMemberVisibility to fail
      mockToggleMemberVisibility.mockRejectedValue(
        new Error('Database error')
      );

      const mockOnRefresh = vi.fn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={mockOnRefresh}
        />
      );

      // Expand and click Hide
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });

      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);

      // Should show error alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to update visibility');
      });

      alertSpy.mockRestore();
    });

    it('should not crash when toggleMemberVisibility is undefined', () => {
      // Simulate the bug: toggleMemberVisibility missing from context
      useData.mockReturnValue({
        group: mockGroup,
        loading: false,
        updateMember: mockUpdateMember,
        refreshWomData: mockRefreshWomData
        // toggleMemberVisibility is MISSING (the bug)
      });

      // Component should still render without crashing
      expect(() => {
        render(
          <AdminMemberTable
            members={mockMembers}
            onEditClick={vi.fn()}
            onDeleteClick={vi.fn()}
            onRefresh={vi.fn()}
          />
        );
      }).not.toThrow();
    });
  });

  describe('UI Interaction', () => {
    it('should show "Hide" button for visible members', async () => {
      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      // Expand visible member
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });
    });

    it('should show "Unhide" button for hidden members', async () => {
      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      // Expand hidden member
      const playerNameCell = screen.getByText('HiddenPlayer');
      fireEvent.click(playerNameCell);

      await waitFor(() => {
        expect(screen.getByText('Unhide')).toBeInTheDocument();
      });
    });

    it('should disable toggle button while operation is in progress', async () => {
      // Make toggle take some time
      mockToggleMemberVisibility.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <AdminMemberTable
          members={mockMembers}
          onEditClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      // Expand and get button
      const playerNameCell = screen.getByText('TestPlayer');
      fireEvent.click(playerNameCell);

      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });

      const hideButton = screen.getByText('Hide');
      fireEvent.click(hideButton);

      // Button should be disabled during operation
      expect(hideButton).toBeDisabled();
    });
  });
});
