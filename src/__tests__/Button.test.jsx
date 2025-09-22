import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../components/ui/Button';

test('Button renders children and responds to click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} className="custom-btn">Click Me</Button>);
  const btn = screen.getByText(/click me/i);
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveClass('custom-btn');
  await userEvent.click(btn);
  expect(handleClick).toHaveBeenCalled();
}); 
