import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from '../pages/EventsPage';

test('renders EventsPage without crashing', () => {
  render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>
  );
  // There may be multiple elements with 'event', so check that at least one exists
  expect(screen.getAllByText(/event/i).length).toBeGreaterThan(0);
}); 
