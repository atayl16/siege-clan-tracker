# React Guidelines - Siege Clan Tracker

## Project Overview

**Siege Clan Tracker** is a React-based web application for tracking Old School RuneScape clan members, their progress, goals, and competitions (races). The project tracks player statistics from the Wise Old Man API and manages clan operations through a Supabase backend.

### Tech Stack (As of Analysis)
- **React**: 18.3.1 (Functional components with Hooks)
- **Language**: JavaScript with JSX (NOT TypeScript)
- **Build Tool**: Vite 5.1.4
- **Testing**: Vitest 3.2.4 with React Testing Library
- **State Management**: React Query (@tanstack/react-query) + Context API + SWR
- **Routing**: React Router 6.23.1
- **UI Framework**: React Bootstrap 2.10.9 + Custom UI Components
- **Backend**: Supabase 2.49.4
- **Data Tables**: TanStack Table 8.21.3
- **Icons**: React Icons 5.5.0 + Bootstrap Icons

### Key Dependencies
- `@tanstack/react-query`: Server state management
- `swr`: Alternative data fetching (mixed usage)
- `axios`: HTTP client (alongside fetch)
- `react-bootstrap`: Bootstrap components
- `react-datepicker`: Date selection
- `@sentry/react`: Error tracking

## Current Patterns (What Exists Now)

This section documents the **actual patterns observed** in the codebase, not idealized versions.

### Component Structure
- **100% Functional Components** - No class components
- **JavaScript with JSX** - No TypeScript usage
- **Sub-component Pattern** - Components define nested components as properties (e.g., `Card.Header`, `Card.Body`, `Card.Footer`)
- **Prop Destructuring** - All components use destructured props with default values
- **CSS Modules** - Each component has a corresponding CSS file

### File Organization
```
src/
├── components/          # All components
│   ├── ui/             # Reusable UI components (Button, Card, Modal, etc.)
│   ├── goals/          # Goal-related components
│   └── admin/          # Admin-specific components
├── pages/              # Page-level components (ProfilePage, LeaderboardPage, etc.)
├── hooks/              # Custom hooks for data operations
├── context/            # React Context providers (AuthContext, DataContext)
├── services/           # Business logic services
├── utils/              # Utility functions
├── assets/             # Images, videos
├── styles/             # Global styles
└── __tests__/          # Test files (also tests in component dirs)
```

### See Resource Files for Details:
- [Component & Hook Patterns](resources/components-and-hooks.md)
- [State Management Approach](resources/state-management.md)
- [Data Fetching Patterns](resources/data-fetching.md)
- [Testing Approach](resources/testing.md)

## Target Patterns (React Best Practices)

While maintaining compatibility with existing code, aim for these improvements when refactoring or adding features:

### Component Best Practices
1. **Memoization**: Use `useMemo` for expensive computations, `useCallback` for function references passed to children
2. **Performance**: Extract complex logic into custom hooks
3. **Prop Types**: Consider adding PropTypes or migrating to TypeScript in the future
4. **Accessibility**: Add ARIA labels and semantic HTML
5. **Error Boundaries**: Wrap component trees in error boundaries for graceful failures

### State Management Principles
1. **Server State**: Prefer React Query for all server data
2. **Local State**: Use `useState` for UI state only
3. **Shared State**: Use Context sparingly, only for truly global state (auth, theme)
4. **Derived State**: Calculate from existing state rather than storing duplicates

### Data Fetching Best Practices
1. **Consistency**: Standardize on React Query instead of mixing SWR and custom hooks
2. **Error Handling**: Provide user-friendly error messages and retry mechanisms
3. **Loading States**: Show skeleton loaders instead of spinners where appropriate
4. **Caching**: Configure appropriate stale times and cache invalidation

### Testing Standards
1. **User-Centric Tests**: Test behavior, not implementation details
2. **Coverage**: Aim for 80%+ coverage on business logic
3. **Integration Tests**: Prefer integration tests over unit tests
4. **Accessibility**: Include accessibility checks in tests

## Common Tasks

### Creating a New Component

**Location**: Place in appropriate directory:
- `src/components/ui/` for reusable UI components
- `src/components/` for feature-specific components
- `src/pages/` for page-level components

**Pattern**:
```javascript
import React from 'react';
import './ComponentName.css';

export default function ComponentName({
  prop1,
  prop2 = 'defaultValue',
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`component-base-class ${className}`} {...props}>
      {children}
    </div>
  );
}

// Sub-components (if needed)
ComponentName.SubComponent = function SubComponent({ children, ...props }) {
  return <div {...props}>{children}</div>;
};
```

### Creating a Custom Hook

**Location**: `src/hooks/`

**Pattern**:
```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useResourceName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('table_name')
        .select('*');

      if (error) throw error;
      setData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
```

### Creating a Test

**Location**: Either `src/__tests__/` or colocated with component in `__tests__/` subdirectory

**Pattern**:
```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentName from '../ComponentName';

test('Component does expected behavior', async () => {
  const handleAction = vi.fn();

  render(<ComponentName onAction={handleAction} />);

  const element = screen.getByText(/expected text/i);
  expect(element).toBeInTheDocument();

  await userEvent.click(element);
  expect(handleAction).toHaveBeenCalled();
});
```

## Common Pitfalls

### State Management
❌ **Don't**: Mix multiple state management approaches for the same data
```javascript
// BAD: Using both React Query and local state for server data
const { data: members } = useQuery(['members']);
const [localMembers, setLocalMembers] = useState([]);
```

✅ **Do**: Use React Query as single source of truth for server data
```javascript
// GOOD: Single source of truth
const { data: members, isLoading } = useQuery(['members'], fetchMembers);
```

### Prop Spreading
❌ **Don't**: Spread props that shouldn't be on DOM elements
```javascript
// BAD: Custom props end up on DOM
<button fullWidth={true} special={true} {...props}>Click</button>
```

✅ **Do**: Filter out custom props before spreading
```javascript
// GOOD: Extract custom props first
const { fullWidth, special, ...domProps } = props;
<button {...domProps}>Click</button>
```

### Effect Dependencies
❌ **Don't**: Omit dependencies or use stale closures
```javascript
// BAD: Missing dependency
useEffect(() => {
  fetchData(userId);
}, []);
```

✅ **Do**: Include all dependencies or use useCallback
```javascript
// GOOD: All dependencies included
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## Code Style

### Naming Conventions
- **Components**: PascalCase (`ProfilePage`, `MemberTable`)
- **Hooks**: camelCase with `use` prefix (`useMembers`, `useAuth`)
- **Utilities**: camelCase (`titleize`, `safeFormat`)
- **Constants**: UPPER_SNAKE_CASE (`ADMIN_EMAIL_HASH`, `SKILLER_RANKS`)
- **CSS Classes**: kebab-case with prefixes (`ui-button`, `profile-container`)

### Import Organization
```javascript
// 1. React and external libraries
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 2. Context and hooks
import { useAuth } from '../context/AuthContext';
import { useMembers } from '../hooks/useMembers';

// 3. Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// 4. Services and utilities
import { updatePlayerGoals } from '../services/goalProgressService';
import { titleize } from '../utils/stringUtils';

// 5. Icons
import { FaUser, FaCog } from 'react-icons/fa';

// 6. Styles (last)
import './ComponentName.css';
```

### Component Layout
```javascript
// 1. Imports
// 2. Constants and helper functions
// 3. Main component function
// 4. Sub-components (if using compound component pattern)
// 5. Export
```

## Code Review Workflow

### Code Rabbit Integration
- Use GitHub MCP to fetch Code Rabbit comments: "Show me Code Rabbit comments on PR #X"
- When addressing Code Rabbit feedback:
  * TypeScript type safety issues (top priority)
  * Component optimization suggestions (memoization, useCallback)
  * Accessibility concerns (add proper ARIA labels, keyboard navigation)
  * Test coverage improvements
- Run `npm run type-check` after addressing TypeScript-related comments
- Run `npm test` to verify changes don't break existing tests

## Project-Specific Notes

### Wise Old Man (WOM) Integration
- `wom_id`: Primary identifier for OSRS players
- Player data comes from Wise Old Man API
- Fresh data is fetched and merged with local database

### Authentication
- Custom auth system using Supabase + localStorage
- Hardcoded admin account for emergency access
- User session managed via AuthContext
- Admin operations require both localStorage flag AND Supabase session token

### Supabase Patterns
- Mix of direct Supabase client calls and Netlify Edge Functions
- Admin operations go through Edge Functions for security
- RPC functions used for complex queries (`get_user_claims`, `get_user_goals`)

### Siege Score System
- Custom scoring system for clan members
- Calculated based on XP gained and boss kills
- Different rank progression for "Skillers" vs "Fighters"

### Code Generation Features
- Generate claim codes for new members
- Codes expire and can only be used once
- Links users to their in-game characters

## Development Workflow

### Running the App
```bash
npm start              # Start dev server (Vite)
npm run build          # Production build
npm run preview        # Preview production build
```

### Testing
```bash
npm test               # Run tests once
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run test:ui        # Vitest UI
```

### Deployment
- Hosted on Netlify
- Edge functions in `netlify/functions/`
- Supabase for backend database
- Staging environment scripts available

---

**Last Updated**: Based on codebase analysis performed 2025-11-13

This skill file reflects the ACTUAL state of the project, not idealized patterns. When making changes, respect existing patterns while gradually improving toward target patterns.
