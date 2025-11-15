# State Management Patterns

## Overview

The Siege Clan Tracker uses a **hybrid state management approach** with:
1. **Context API** for authentication and global app state
2. **React Query** (@tanstack/react-query) for server state
3. **SWR** for some data fetching (mixed with React Query)
4. **Local useState** for component UI state
5. **Custom hooks** that manage their own state

**NO Redux is used in this project.**

## State Categories

### 1. Global State (Context API)

#### AuthContext - Authentication State
**Location**: [src/context/AuthContext.jsx](../../../src/context/AuthContext.jsx)

**State Managed**:
```javascript
{
  isAuthenticated: boolean,      // Admin authentication
  user: {                        // Current user object
    id: string,                  // UUID or "admin"
    username: string,
    is_admin: boolean,
    created_at: string,
  },
  userClaims: [],                // User's claimed characters
  loading: boolean,              // Initial load state
}
```

**Operations Provided**:
- `login(username, password)` - Authenticate user
- `logout()` - Clear session
- `register(username, password)` - Create new user
- `claimPlayer(code)` - Claim a character
- `toggleAdminStatus(userId, makeAdmin)` - Promote/demote admin
- `isAdmin()` - Check admin status
- `isLoggedIn()` - Check if any user is logged in
- `fetchUserClaims(userId)` - Refresh user's claims

**Usage**:
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!user) {
    return <LoginPrompt />;
  }

  return <div>Welcome, {user.username}!</div>;
}
```

**Key Patterns**:
- Synchronizes with `localStorage` for persistence
- Mixes custom authentication with Supabase Auth
- Hardcoded admin account for emergency access
- Operations handle both state updates AND API calls

#### DataContext (if exists)
**Location**: [src/context/DataContext.jsx](../../../src/context/DataContext.jsx)

This context may exist but wasn't fully analyzed. Check file for current usage.

### 2. Server State (React Query)

React Query is used for some server data fetching, but implementation is mixed with SWR and custom hooks.

**Current Usage**: Limited - appears in imports but not consistently used across all data fetching.

**Ideal Pattern** (target for refactoring):
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query for fetching data
function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .is('left_date', null);

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
  });
}

// Mutation for updating data
function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData) => {
      // API call
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
```

### 3. Data Fetching with SWR

**Pattern**: [useClaimRequests.js](../../../src/hooks/useClaimRequests.js)

```javascript
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useClaimRequests() {
  const { data, error, mutate } = useSWR("/api/claim-requests", fetcher, {
    refreshInterval: 60000,        // Auto-refresh every minute
    dedupingInterval: 30000,       // Dedupe requests within 30s
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  return {
    claimRequests: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
```

**Key Features**:
- Automatic caching and deduplication
- Background revalidation
- Configurable refresh intervals
- Simple API

### 4. Custom State Management Hooks

Many hooks manage their own state manually with useState.

**Pattern**: [useMembers.js](../../../src/hooks/useMembers.js)

```javascript
export function useMembers() {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = getAdminSupabaseClient();
      const { data, error: fetchError } = await client
        .from('members')
        .select('*')
        .is('left_date', null)
        .order('name');

      if (fetchError) throw fetchError;
      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMember = async (memberData) => {
    try {
      // ... update logic ...
      await fetchMembers(); // Refresh after mutation
      return result.data;
    } catch (err) {
      console.error('Error updating member:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refreshMembers: fetchMembers,
    createMember,
    updateMember,
    deleteMember,
    // ... more operations
  };
}
```

**Key Patterns**:
- Manual loading/error state
- `useCallback` for fetch function stability
- Operations included in hook return
- Refresh after mutations
- Consistent return shape: `{ data, loading, error, operations }`

### 5. Local Component State

**Used for**: UI state that doesn't need to be shared
- Modal open/closed
- Form inputs
- Accordion expand/collapse
- Tab selection
- Filter values

**Pattern**:
```javascript
function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [searchTerm, setSearchTerm] = useState('');

  // Component logic
}
```

## State Flow Patterns

### Pattern 1: Fetch on Mount
```javascript
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData must be stable (useCallback)
```

### Pattern 2: Fetch with Dependencies
```javascript
useEffect(() => {
  if (userId) {
    fetchUserData(userId);
  }
}, [userId, fetchUserData]);
```

### Pattern 3: Refresh on User Action
```javascript
const handleSubmit = async () => {
  await createItem(data);
  refreshItems(); // Re-fetch after mutation
};
```

### Pattern 4: Optimistic Updates (Target Pattern)
```javascript
const { mutate } = useSWR('/api/data', fetcher);

const updateItem = async (id, newData) => {
  // Optimistically update the UI
  mutate(
    (currentData) => currentData.map(item =>
      item.id === id ? { ...item, ...newData } : item
    ),
    false // Don't revalidate yet
  );

  // Make the API call
  await api.update(id, newData);

  // Revalidate
  mutate();
};
```

## Data Synchronization

### Merging Server Data with Local Data

**Example**: [MemberTable.jsx](../../../src/components/MemberTable.jsx:205-242) merging WOM data

```javascript
const enhancedMembers = useMemo(() => {
  if (!members || !groupData?.memberships) return members;

  // Create lookup map
  const womMembersMap = {};
  groupData.memberships.forEach((membership) => {
    if (membership.player?.id) {
      womMembersMap[membership.player.id] = {
        ...membership.player,
        role: membership.role,
      };
    }
  });

  // Merge fresh API data with local database data
  return members.map((member) => {
    const womMember = member.wom_id ? womMembersMap[member.wom_id] : null;

    if (womMember) {
      return {
        ...member,
        // Prefer fresh WOM data, fallback to DB
        current_xp: womMember.latestSnapshot?.data?.skills?.overall?.experience || member.current_xp,
        current_lvl: womMember.latestSnapshot?.data?.skills?.overall?.level || member.current_lvl,
        womrole: womMember.role || member.womrole,
        // ... more fields
      };
    }
    return member;
  });
}, [members, groupData]);
```

**Key Observations**:
- Creates lookup map for O(1) access
- Prefers fresh API data over stale database data
- Fallback chain for missing data
- Memoized to prevent unnecessary recalculations

## State Update Patterns

### Updating Nested State
```javascript
// BAD: Mutating state
members[0].name = 'New Name';
setMembers(members);

// GOOD: Creating new reference
setMembers(members.map(member =>
  member.id === targetId
    ? { ...member, name: 'New Name' }
    : member
));
```

### Updating Arrays
```javascript
// Add item
setItems([...items, newItem]);

// Remove item
setItems(items.filter(item => item.id !== removeId));

// Update item
setItems(items.map(item =>
  item.id === updateId ? { ...item, ...updates } : item
));
```

### Functional Updates
```javascript
// When new state depends on old state
setCount(prevCount => prevCount + 1);

// Safer for async updates
setMembers(prevMembers => [...prevMembers, newMember]);
```

## Form State Management

### Controlled Components
```javascript
const [formData, setFormData] = useState({
  username: '',
  email: '',
});

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value,
  }));
};

<input
  name="username"
  value={formData.username}
  onChange={handleChange}
/>
```

### Individual State per Field
```javascript
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');

<input value={username} onChange={(e) => setUsername(e.target.value)} />
<input value={email} onChange={(e) => setEmail(e.target.value)} />
```

## Derived State

### Computing from Existing State
```javascript
// DON'T store derived state
const [members, setMembers] = useState([]);
const [activeMembersCount, setActiveMembersCount] = useState(0); // BAD

// DO compute on render
const [members, setMembers] = useState([]);
const activeMembersCount = members.filter(m => !m.left_date).length; // GOOD

// Or use useMemo for expensive computations
const activeMembersCount = useMemo(
  () => members.filter(m => !m.left_date).length,
  [members]
);
```

## State Persistence

### LocalStorage Sync Pattern
```javascript
// Initialize from localStorage
const [user, setUser] = useState(
  JSON.parse(localStorage.getItem('user')) || null
);

// Sync to localStorage on change
useEffect(() => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}, [user]);
```

## Common Issues & Solutions

### Issue 1: Infinite Loops with useEffect

**Problem**:
```javascript
const fetchData = async () => {
  const data = await api.fetch();
  setData(data);
};

useEffect(() => {
  fetchData();
}, [fetchData]); // Creates new function on every render!
```

**Solution**:
```javascript
const fetchData = useCallback(async () => {
  const data = await api.fetch();
  setData(data);
}, []); // Stable reference

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Issue 2: Stale Closures

**Problem**:
```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1); // count is stale!
  }, 1000);
  return () => clearInterval(interval);
}, []); // Empty deps means count never updates
```

**Solution**:
```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // Functional update
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

### Issue 3: Race Conditions

**Problem**:
```javascript
useEffect(() => {
  fetchData(userId);
}, [userId]);

// If userId changes quickly, responses may arrive out of order
```

**Solution**:
```javascript
useEffect(() => {
  let cancelled = false;

  const fetch = async () => {
    const data = await fetchData(userId);
    if (!cancelled) {
      setData(data);
    }
  };

  fetch();

  return () => {
    cancelled = true;
  };
}, [userId]);
```

## Best Practices Summary

1. **Use Context sparingly** - Only for truly global state (auth, theme)
2. **Prefer React Query/SWR over manual state** - For server data
3. **Keep UI state local** - Don't lift state unnecessarily
4. **Use useCallback for effect dependencies** - Prevents infinite loops
5. **Functional updates for async** - When new state depends on old
6. **Derive don't duplicate** - Compute from existing state
7. **Memoize expensive computations** - Use useMemo
8. **Clean up effects** - Return cleanup functions
9. **Handle race conditions** - Use cancellation flags
10. **Consistent return shapes** - All data hooks return { data, loading, error, operations }

## Future Improvements

1. **Standardize on React Query** - Move away from mixed SWR/custom hooks approach
2. **Reduce Context usage** - Move more state into React Query
3. **Add error boundaries** - Gracefully handle state errors
4. **Implement optimistic updates** - Better UX for mutations
5. **Type safety** - Migrate to TypeScript for better state typing
