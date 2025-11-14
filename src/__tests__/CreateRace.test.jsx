import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateRace from '../components/CreateRace';

// Mock the useRaces hook
const mockCreateRace = vi.fn();
vi.mock('../hooks/useRaces', () => ({
  useRaces: () => ({
    createRace: mockCreateRace,
  }),
}));

// Mock the MemberSelector and MetricSelector components
vi.mock('../components/MemberSelector', () => ({
  default: ({ onSelect, value }) => (
    <div data-testid="member-selector">
      <button
        onClick={() => onSelect({ wom_id: 123, name: 'TestPlayer' })}
      >
        Select TestPlayer
      </button>
      <span>{value ? 'Selected' : 'Not Selected'}</span>
    </div>
  ),
}));

vi.mock('../components/MetricSelector', () => ({
  default: ({ metricType, value, onChange }) => (
    <div data-testid="metric-selector">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="metric-select"
      >
        <option value="">Select metric</option>
        <option value="ehb">EHB</option>
        <option value="ehp">EHP</option>
      </select>
      <span>{metricType}</span>
    </div>
  ),
}));

describe('CreateRace Component', () => {
  const mockUserId = 'user-123';
  const mockOnCreated = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the form with all required fields', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/race title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/public race/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByTestId('member-selector')).toBeInTheDocument();
      expect(screen.getByTestId('metric-selector')).toBeInTheDocument();
    });

    it('should render Cancel and Create Race buttons', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create race/i })).toBeInTheDocument();
    });

    it('should start with one participant', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const memberSelectors = screen.getAllByTestId('member-selector');
      expect(memberSelectors).toHaveLength(1);
    });
  });

  describe('Participant Management', () => {
    it('should add a new participant when Add Participant button is clicked', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const addButton = screen.getByRole('button', { name: /add participant/i });
      fireEvent.click(addButton);

      const memberSelectors = screen.getAllByTestId('member-selector');
      expect(memberSelectors).toHaveLength(2);
    });

    it('should remove a participant when remove button is clicked', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Add a second participant
      const addButton = screen.getByRole('button', { name: /add participant/i });
      fireEvent.click(addButton);

      expect(screen.getAllByTestId('member-selector')).toHaveLength(2);

      // Remove the second participant
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[1]);

      expect(screen.getAllByTestId('member-selector')).toHaveLength(1);
    });

    it('should not allow removing the last participant', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const removeButtons = screen.queryAllByRole('button', { name: /remove/i });

      // Should not be able to remove when only 1 participant
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(screen.getAllByTestId('member-selector')).toHaveLength(1);
      }
    });
  });

  describe('Form Validation', () => {
    it('should show error when title is empty', async () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      expect(mockCreateRace).not.toHaveBeenCalled();
    });

    it('should show error when participant details are incomplete', async () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Fill in title
      const titleInput = screen.getByLabelText(/race title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Race' } });

      const submitButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/all participant details must be complete/i)).toBeInTheDocument();
      });

      expect(mockCreateRace).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call createRace with correct data on valid submission', async () => {
      mockCreateRace.mockResolvedValue({ id: 1, title: 'Test Race' });

      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Fill in form
      const titleInput = screen.getByLabelText(/race title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Race' } });

      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Test Description' } });

      // Select player
      const selectPlayerButton = screen.getByText(/select testplayer/i);
      fireEvent.click(selectPlayerButton);

      // Select metric
      const metricSelect = screen.getByTestId('metric-select');
      fireEvent.change(metricSelect, { target: { value: 'ehb' } });

      // Set target value
      const targetInput = screen.getByLabelText(/target value/i);
      fireEvent.change(targetInput, { target: { value: '100' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateRace).toHaveBeenCalledWith({
          creator_id: mockUserId,
          title: 'Test Race',
          description: 'Test Description',
          public: false,
          end_date: null,
          participants: [
            {
              wom_id: 123,
              player_name: 'TestPlayer',
              metric: 'ehb',
              target_value: 100,
            },
          ],
        });
      });

      expect(mockOnCreated).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockCreateRace.mockRejectedValue(new Error('API Error: Unauthorized'));

      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Fill in minimal valid form
      const titleInput = screen.getByLabelText(/race title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Race' } });

      const selectPlayerButton = screen.getByText(/select testplayer/i);
      fireEvent.click(selectPlayerButton);

      const metricSelect = screen.getByTestId('metric-select');
      fireEvent.change(metricSelect, { target: { value: 'ehb' } });

      const targetInput = screen.getByLabelText(/target value/i);
      fireEvent.change(targetInput, { target: { value: '100' } });

      const submitButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/api error: unauthorized/i)).toBeInTheDocument();
      });

      expect(mockOnCreated).not.toHaveBeenCalled();
    });

    it('should disable submit button while submitting', async () => {
      mockCreateRace.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Fill in minimal valid form
      const titleInput = screen.getByLabelText(/race title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Race' } });

      const selectPlayerButton = screen.getByText(/select testplayer/i);
      fireEvent.click(selectPlayerButton);

      const metricSelect = screen.getByTestId('metric-select');
      fireEvent.change(metricSelect, { target: { value: 'ehb' } });

      const targetInput = screen.getByLabelText(/target value/i);
      fireEvent.change(targetInput, { target: { value: '100' } });

      const submitButton = screen.getByRole('button', { name: /create race/i });
      fireEvent.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when Cancel button is clicked', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Public/Private Toggle', () => {
    it('should toggle public state when checkbox is clicked', () => {
      render(
        <CreateRace
          userId={mockUserId}
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const publicCheckbox = screen.getByLabelText(/public race/i);

      expect(publicCheckbox).not.toBeChecked();

      fireEvent.click(publicCheckbox);

      expect(publicCheckbox).toBeChecked();
    });
  });
});
