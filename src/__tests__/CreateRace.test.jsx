import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CreateRace from '../components/CreateRace';

const createRace = vi.fn().mockResolvedValue({ id: 'r1' });
let claims = [];

vi.mock('../hooks/useRaces', () => ({ useRaces: () => ({ createRace }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ userClaims: claims }) }));
// Stand-ins: the member picker shows its selection and can pick "Dan";
// the metric picker can pick "sailing".
vi.mock('../components/MemberSelector', () => ({
  default: ({ selectedMemberId, onMemberSelect }) => (
    <div>
      <span>selected:{String(selectedMemberId)}</span>
      <button type="button" onClick={() => onMemberSelect({ wom_id: 99, name: 'Dan xo' })}>pick Dan</button>
    </div>
  ),
}));
vi.mock('../components/MetricSelector', () => ({
  default: ({ onMetricChange }) => (
    <button type="button" onClick={() => onMetricChange('sailing')}>pick sailing</button>
  ),
}));

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByPlaceholderText(/woodcutting challenge/i), 'Sailing Challenge');
  await userEvent.click(screen.getByText('pick sailing'));
  await userEvent.type(screen.getByPlaceholderText(/target value/i), '20000');
  await userEvent.click(screen.getByRole('button', { name: /create race/i }));
};

beforeEach(() => {
  createRace.mockClear();
  claims = [{ wom_id: 1, members: { wom_id: 1, name: 'Roinrin' } }];
});

test("starts the race with the creator's own character", () => {
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByText('selected:1')).toBeInTheDocument();
});

test('refuses a race with none of the creator\'s characters in it', async () => {
  // What happened on the live site: the only participant was someone else.
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.click(screen.getByText('pick Dan'));
  await fillAndSubmit();

  expect(screen.getByText(/include at least one of your own characters/i)).toBeInTheDocument();
  expect(createRace).not.toHaveBeenCalled();
});

test('creates the race when the creator is in it', async () => {
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await fillAndSubmit();

  expect(createRace).toHaveBeenCalledWith(
    expect.objectContaining({
      participants: [expect.objectContaining({ wom_id: 1, player_name: 'Roinrin', metric: 'sailing', target_value: 20000 })],
    })
  );
});

test('asks a member with no claimed character to claim one first', async () => {
  claims = [];
  render(<CreateRace userId="u1" onCreated={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.click(screen.getByText('pick Dan'));
  await fillAndSubmit();

  expect(screen.getByText(/claim one of your characters/i)).toBeInTheDocument();
  expect(createRace).not.toHaveBeenCalled();
});
