# Testing Patterns

## Testing Stack

**Test Runner**: Vitest 3.2.4
**Testing Library**: React Testing Library 16.3.0
**User Event**: @testing-library/user-event 13.5.0
**DOM Testing**: @testing-library/jest-dom 6.6.3

## Test Scripts

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
npm run test:ui       # Open Vitest UI
```

## Test File Organization

### Current Pattern

Tests are located in two places:
1. **`src/__tests__/`** - Most test files
2. **Component directories** - Some tests colocated (e.g., `src/components/admin/__tests__/`)

### Files Found
- `src/__tests__/AdminUserManager.test.jsx`
- `src/__tests__/Navbar.test.jsx`
- `src/__tests__/Button.test.jsx`
- `src/__tests__/Leaderboard.test.jsx`
- `src/__tests__/GoalCard.test.jsx`
- `src/__tests__/AchievementsPage.test.jsx`
- `src/__tests__/App.test.jsx`
- `src/__tests__/ClaimRequestManager.test.jsx`
- `src/__tests__/LeaderboardPage.test.jsx`
- `src/__tests__/EventsPage.test.jsx`
- `src/__tests__/Navigation.test.jsx`
- `src/__tests__/MembersPage.test.jsx`
- `src/__tests__/RaceCard.test.jsx`
- `src/__tests__/useMembers.test.jsx`
- `src/__tests__/ProgressPage.test.jsx`
- `src/__tests__/ProfilePage.test.jsx`
- `src/components/admin/__tests__/AdminMemberTable.test.jsx`
- `src/services/__tests__/goalProgressService.test.js`
- `src/utils/__tests__/rankUtils.test.js`
- `src/utils/__tests__/seasonalIcons.test.js`
- `src/utils/__tests__/stringUtils.test.js`

## Component Testing Patterns

### Basic Component Test

**Pattern**: [Button.test.jsx](../../../src/__tests__/Button.test.jsx)

```javascript
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
```

**Key Observations**:
- Use `vi.fn()` for mock functions (Vitest API)
- Use `render()` from React Testing Library
- Query by text, role, or label (user-centric queries)
- Test user interactions with `userEvent`
- Test rendered output with `expect().toBeInTheDocument()`

### Testing Component Props and Variants

```javascript
test('Button renders with different variants', () => {
  const { rerender } = render(<Button variant="primary">Primary</Button>);
  expect(screen.getByText('Primary')).toHaveClass('ui-button-primary');

  rerender(<Button variant="secondary">Secondary</Button>);
  expect(screen.getByText('Secondary')).toHaveClass('ui-button-secondary');
});

test('Button renders with icon', () => {
  const icon = <span data-testid="test-icon">★</span>;
  render(<Button icon={icon} iconPosition="left">Button</Button>);

  expect(screen.getByTestId('test-icon')).toBeInTheDocument();
});
```

### Testing Conditional Rendering

```javascript
test('Shows loading state', () => {
  render(<MyComponent loading={true} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('Shows error state', () => {
  render(<MyComponent error="Something went wrong" />);
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

test('Shows content when loaded', () => {
  const data = [{ id: 1, name: 'Item 1' }];
  render(<MyComponent data={data} loading={false} />);
  expect(screen.getByText('Item 1')).toBeInTheDocument();
});
```

## Testing Hooks

### Hook Testing Pattern

**Pattern**: [useMembers.test.jsx](../../../src/__tests__/useMembers.test.jsx)

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useMembers } from '../hooks/useMembers';

test('useMembers fetches and returns members', async () => {
  const { result } = renderHook(() => useMembers());

  // Initially loading
  expect(result.current.loading).toBe(true);
  expect(result.current.members).toBe(null);

  // Wait for data to load
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  // Check data
  expect(result.current.members).toBeDefined();
  expect(Array.isArray(result.current.members)).toBe(true);
});

test('useMembers refresh function works', async () => {
  const { result } = renderHook(() => useMembers());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  // Call refresh
  result.current.refreshMembers();

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
});
```

**Key Patterns**:
- Use `renderHook()` from React Testing Library
- Use `waitFor()` for async operations
- Test initial state, loading state, and final state
- Test hook operations (refresh, mutations)

## Testing with Context

### Wrapping Components with Context

```javascript
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import MyComponent from '../components/MyComponent';

test('Component uses auth context', () => {
  render(
    <AuthProvider>
      <MyComponent />
    </AuthProvider>
  );

  // Test component behavior with context
});
```

### Providing Mock Context Values

```javascript
import { AuthContext } from '../context/AuthContext';

test('Component handles logged out state', () => {
  const mockAuthValue = {
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

  render(
    <AuthContext.Provider value={mockAuthValue}>
      <MyComponent />
    </AuthContext.Provider>
  );

  expect(screen.getByText(/please log in/i)).toBeInTheDocument();
});

test('Component handles logged in state', () => {
  const mockAuthValue = {
    user: { id: '123', username: 'testuser' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  };

  render(
    <AuthContext.Provider value={mockAuthValue}>
      <MyComponent />
    </AuthContext.Provider>
  );

  expect(screen.getByText(/welcome, testuser/i)).toBeInTheDocument();
});
```

## Testing Async Operations

### Testing Data Fetching

```javascript
import { render, screen, waitFor } from '@testing-library/react';

test('Component fetches and displays data', async () => {
  render(<MyComponent />);

  // Should show loading initially
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Check that data is displayed
  expect(screen.getByText(/expected content/i)).toBeInTheDocument();
});
```

### Testing Error Handling

```javascript
test('Component handles fetch errors', async () => {
  // Mock fetch to throw error
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Testing User Interactions

### Click Events

```javascript
import userEvent from '@testing-library/user-event';

test('Button click triggers callback', async () => {
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Click Me</Button>);

  await userEvent.click(screen.getByText(/click me/i));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Form Interactions

```javascript
test('Form submission works', async () => {
  const handleSubmit = vi.fn();

  render(<MyForm onSubmit={handleSubmit} />);

  // Type in input
  await userEvent.type(screen.getByLabelText(/username/i), 'testuser');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');

  // Submit form
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'password123',
  });
});
```

### Typing in Inputs

```javascript
test('Input updates on type', async () => {
  render(<SearchInput />);

  const input = screen.getByRole('textbox');

  await userEvent.type(input, 'search term');

  expect(input).toHaveValue('search term');
});
```

### Selecting from Dropdown

```javascript
test('Dropdown selection works', async () => {
  render(<Dropdown options={['Option 1', 'Option 2']} />);

  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByText('Option 1'));

  expect(screen.getByText('Option 1')).toBeInTheDocument();
});
```

## Testing Utilities and Services

### Pure Function Tests

**Pattern**: [stringUtils.test.js](../../../src/utils/__tests__/stringUtils.test.js)

```javascript
import { titleize, slugify } from '../stringUtils';

test('titleize capitalizes first letter of each word', () => {
  expect(titleize('hello world')).toBe('Hello World');
  expect(titleize('hello-world')).toBe('Hello-World');
  expect(titleize('HELLO WORLD')).toBe('Hello World');
});

test('slugify converts string to URL-friendly slug', () => {
  expect(slugify('Hello World')).toBe('hello-world');
  expect(slugify('Hello  World')).toBe('hello-world');
  expect(slugify('Hello_World')).toBe('hello-world');
});
```

### Service Function Tests

**Pattern**: [goalProgressService.test.js](../../../src/services/__tests__/goalProgressService.test.js)

```javascript
import { extractMetricData, updatePlayerGoals } from '../goalProgressService';

test('extractMetricData extracts skill data correctly', () => {
  const playerData = {
    latestSnapshot: {
      data: {
        skills: {
          attack: { experience: 13034431, level: 99, rank: 12345 }
        }
      }
    }
  };

  const result = extractMetricData(playerData, 'skill', 'attack');

  expect(result).toEqual({
    experience: 13034431,
    level: 99,
    rank: 12345
  });
});

test('extractMetricData returns default for missing skill', () => {
  const playerData = { latestSnapshot: { data: { skills: {} } } };

  const result = extractMetricData(playerData, 'skill', 'nonexistent');

  expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
});
```

## Mocking Patterns

### Mocking Functions

```javascript
// Create mock function
const mockFn = vi.fn();

// Mock implementation
mockFn.mockImplementation(() => 'mocked value');

// Mock return value
mockFn.mockReturnValue('value');

// Mock resolved promise
mockFn.mockResolvedValue({ data: 'value' });

// Mock rejected promise
mockFn.mockRejectedValue(new Error('error'));

// Check calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(3);
```

### Mocking Modules

```javascript
// Mock entire module
vi.mock('../services/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' })),
}));

// Mock specific exports
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));
```

### Mocking Supabase

```javascript
vi.mock('../supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Test' }],
          error: null
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'mock-token' } }
      })),
    },
  };

  return { supabase: mockSupabase };
});
```

## Query Strategies

### Recommended Query Priority

1. **getByRole** - Preferred for accessibility
2. **getByLabelText** - For form inputs
3. **getByPlaceholderText** - For inputs without labels
4. **getByText** - For non-interactive content
5. **getByDisplayValue** - For inputs with values
6. **getByAltText** - For images
7. **getByTitle** - For elements with title
8. **getByTestId** - Last resort

### Query Variants

```javascript
// getBy* - Throws error if not found
const element = screen.getByText('Hello');

// queryBy* - Returns null if not found
const element = screen.queryByText('Hello');

// findBy* - Returns promise, waits for element
const element = await screen.findByText('Hello');

// getAllBy* - Returns array, throws if none found
const elements = screen.getAllByRole('button');

// queryAllBy* - Returns empty array if none found
const elements = screen.queryAllByRole('button');

// findAllBy* - Returns promise with array
const elements = await screen.findAllByRole('button');
```

## Custom Matchers (jest-dom)

```javascript
// Presence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Enabled/Disabled
expect(element).toBeEnabled();
expect(element).toBeDisabled();

// Classes
expect(element).toHaveClass('active');
expect(element).not.toHaveClass('inactive');

// Attributes
expect(element).toHaveAttribute('href', '/path');
expect(element).not.toHaveAttribute('disabled');

// Text Content
expect(element).toHaveTextContent('Hello World');
expect(element).not.toHaveTextContent('Goodbye');

// Form Values
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
```

## Best Practices

### Do's

1. **Test user behavior** - Not implementation details
2. **Use user-centric queries** - getByRole, getByLabelText
3. **Test accessibility** - Use semantic HTML and ARIA
4. **Wait for async** - Use waitFor, findBy queries
5. **Mock external dependencies** - APIs, Supabase, etc.
6. **Test error states** - Not just happy path
7. **Keep tests isolated** - Each test independent
8. **Use descriptive test names** - What is being tested

### Don'ts

1. **Don't test implementation** - Avoid testing state directly
2. **Don't rely on test IDs** - Use semantic queries
3. **Don't test library code** - Trust React, Supabase work
4. **Don't use snapshot tests excessively** - Fragile and hard to maintain
5. **Don't skip cleanup** - React Testing Library handles this
6. **Don't test styles directly** - Use class names or computed styles
7. **Don't forget edge cases** - Empty states, errors, loading

## Example: Complete Component Test

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MemberTable from '../components/MemberTable';
import { AuthProvider } from '../context/AuthContext';

// Mock hooks
vi.mock('../hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    members: [
      { wom_id: 1, name: 'Player1', current_lvl: 100, ehb: 50 },
      { wom_id: 2, name: 'Player2', current_lvl: 90, ehb: 30 },
    ],
    loading: false,
    error: null,
  })),
}));

vi.mock('../hooks/useGroup', () => ({
  useGroup: vi.fn(() => ({
    groupData: null,
    loading: false,
  })),
}));

describe('MemberTable', () => {
  test('renders member names', () => {
    render(
      <AuthProvider>
        <MemberTable />
      </AuthProvider>
    );

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Player2')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    const { useMembers } = require('../hooks/useMembers');
    useMembers.mockReturnValue({
      members: null,
      loading: true,
      error: null,
    });

    render(<MemberTable />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('expands row on click', async () => {
    render(<MemberTable />);

    const row = screen.getByText('Player1').closest('tr');

    await userEvent.click(row);

    // Check for expanded content
    await waitFor(() => {
      expect(screen.getByText(/siege score/i)).toBeInTheDocument();
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- Button.test.jsx

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run UI mode
npm run test:ui
```

## Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Focus coverage on:
- Business logic
- Utility functions
- Complex components
- Critical user paths

Lower priority:
- UI-only components
- Third-party integrations
- Configuration files
