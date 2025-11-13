# Data Fetching Patterns

## Overview

The Siege Clan Tracker uses multiple data fetching approaches:
1. **Supabase Client** - Direct database queries
2. **Netlify Edge Functions** - Admin operations and secure endpoints
3. **Wise Old Man API** - External OSRS player data
4. **SWR** - Some data fetching with caching
5. **Custom Hooks** - Manual data fetching with state management

## Supabase Patterns

### Direct Supabase Queries

**Basic Query Pattern**:
```javascript
import { supabase } from '../supabaseClient';

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('column_name')
  .single(); // or .limit(10)

if (error) {
  console.error('Error:', error);
  throw error;
}

return data;
```

### Admin vs Regular Client

**Pattern**: [useMembers.js](../../../src/hooks/useMembers.js:29-60)

```javascript
import { getAdminSupabaseClient } from '../utils/supabaseClient';
import { supabase } from '../supabaseClient';

// Get the appropriate client based on admin status
const client = getAdminSupabaseClient();

// or use regular client for non-admin operations
const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

**Key Points**:
- `getAdminSupabaseClient()` checks localStorage for admin flag
- Returns service role client for admin operations
- Regular `supabase` client has RLS (Row Level Security) enabled

### RPC (Remote Procedure Call) Pattern

**Pattern**: [AuthContext.jsx](../../../src/context/AuthContext.jsx:274-279) and [goalProgressService.js](../../../src/services/goalProgressService.js:56-74)

```javascript
// Call a Postgres function
const { data, error } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2,
});

if (error) throw error;
return data;
```

**Common RPC Functions**:
- `get_user_claims(user_id_param)` - Get user's claimed characters
- `get_user_goals(user_id_param)` - Get user's goals
- `admin_change_member_rank(member_id, new_role)` - Change member rank
- `register_admin_user()` - Register admin in database

**Why Use RPC**:
- Complex queries beyond Supabase query builder
- Business logic in database
- Better performance for complex operations
- Row Level Security enforcement

### Insert/Update/Delete Patterns

**Insert**:
```javascript
const { data, error } = await supabase
  .from('table_name')
  .insert([
    { column1: value1, column2: value2 }
  ])
  .select(); // Return inserted data

if (error) throw error;
return data[0];
```

**Update**:
```javascript
const { data, error } = await supabase
  .from('table_name')
  .update({ column: newValue })
  .eq('id', itemId)
  .select();

if (error) throw error;
return data[0];
```

**Delete**:
```javascript
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', itemId);

if (error) throw error;
```

### Authentication with Supabase

**Get Session Token** (for admin operations):
```javascript
async function getAuthHeaders() {
  const isAdmin = localStorage.getItem("adminAuth") === "true";

  if (!isAdmin) {
    throw new Error('Admin authentication required');
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Missing Supabase session token');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
  };
}
```

## Netlify Edge Functions

### Admin Operations Pattern

**Pattern**: [useMembers.js](../../../src/hooks/useMembers.js:85-129)

```javascript
const updateMember = async (memberData) => {
  try {
    // Get auth headers
    const authHeaders = await getAuthHeaders();

    // Call edge function instead of direct Supabase
    const response = await fetch('/.netlify/functions/admin-update-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        memberId: memberData.wom_id,
        updatedData: memberData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update member');
    }

    const result = await response.json();

    // Refresh after mutation
    await fetchMembers();
    return result.data;
  } catch (err) {
    console.error('Error updating member:', err);
    throw err;
  }
};
```

**Why Use Edge Functions**:
- Security - Keep service role key server-side
- Validation - Server-side business logic
- Rate limiting - Prevent abuse
- Complex operations - Multi-step transactions

**Common Edge Functions**:
- `admin-update-member` - Update member data
- `admin-delete-member` - Delete member
- `admin-toggle-member-visibility` - Hide/show member
- `admin-toggle-user-admin` - Promote/demote admin

## SWR Data Fetching

**Pattern**: [useClaimRequests.js](../../../src/hooks/useClaimRequests.js)

```javascript
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useClaimRequests() {
  const { data, error, mutate } = useSWR("/api/claim-requests", fetcher, {
    refreshInterval: 60000,        // Refresh every 60s
    dedupingInterval: 30000,       // Dedupe within 30s
    revalidateOnMount: true,       // Fetch on component mount
    revalidateOnFocus: false,      // Don't fetch on window focus
  });

  return {
    claimRequests: data,
    loading: !data && !error,
    error,
    refresh: mutate,
  };
}
```

**SWR Features**:
- Automatic caching
- Deduplication
- Background revalidation
- Focus revalidation
- Interval polling
- Optimistic updates

**SWR Configuration Options**:
```javascript
{
  refreshInterval: 60000,         // Auto-refresh interval (ms)
  refreshWhenHidden: false,       // Refresh when tab hidden
  refreshWhenOffline: false,      // Refresh when offline
  revalidateOnMount: true,        // Fetch on mount
  revalidateOnFocus: false,       // Fetch on window focus
  revalidateOnReconnect: true,    // Fetch when reconnecting
  dedupingInterval: 2000,         // Dedupe requests within 2s
  shouldRetryOnError: true,       // Retry on error
  errorRetryCount: 3,             // Max retries
  errorRetryInterval: 5000,       // Retry interval (ms)
}
```

## Custom Data Fetching Hooks

### Full CRUD Hook Pattern

**Pattern**: [useMembers.js](../../../src/hooks/useMembers.js)

```javascript
export function useMembers() {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // READ - Fetch all
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

  // CREATE
  const createMember = async (memberData) => {
    try {
      const client = getAdminSupabaseClient();
      const { data, error: createError } = await client
        .from('members')
        .insert([memberData])
        .select();

      if (createError) throw createError;

      fetchMembers(); // Refresh list
      return data[0];
    } catch (err) {
      console.error('Error creating member:', err);
      throw err;
    }
  };

  // UPDATE
  const updateMember = async (memberData) => {
    if (!memberData || !memberData.wom_id) {
      throw new Error('Missing member WOM ID');
    }

    try {
      // Call edge function for admin operations
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/.netlify/functions/admin-update-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          memberId: memberData.wom_id,
          updatedData: memberData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update');
      }

      const result = await response.json();
      await fetchMembers(); // Refresh list
      return result.data;
    } catch (err) {
      console.error('Error updating member:', err);
      throw err;
    }
  };

  // DELETE
  const deleteMember = async (womId) => {
    if (!womId) {
      throw new Error('Missing WOM ID');
    }

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/.netlify/functions/admin-delete-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ womId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }

      fetchMembers(); // Refresh list
      return true;
    } catch (err) {
      console.error('Error deleting member:', err);
      throw err;
    }
  };

  // Initial fetch
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
  };
}
```

**Key Patterns**:
1. State: `data`, `loading`, `error`
2. Operations: `create`, `read`, `update`, `delete`, `refresh`
3. `useCallback` for stable fetch function
4. Refresh after mutations
5. Consistent error handling
6. Initial fetch in `useEffect`

### Simple Read-Only Hook Pattern

```javascript
export function useResource(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('table')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!cancelled) {
          setData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true; // Prevent state updates if unmounted
    };
  }, [id]);

  return { data, loading, error };
}
```

## Service Layer Pattern

### Business Logic in Services

**Pattern**: [goalProgressService.js](../../../src/services/goalProgressService.js)

```javascript
// Service functions encapsulate business logic
export async function updatePlayerGoals(womId, userId) {
  try {
    console.log(`Updating goals for player: ${womId}, user: ${userId}`);

    // Fetch goals using RPC
    const { data: allGoals, error } = await supabase.rpc("get_user_goals", {
      user_id_param: userId,
    });

    if (error) throw error;

    // Filter for this player
    const goals = allGoals
      ? allGoals.filter((goal) => goal.wom_id === womId && !goal.completed)
      : [];

    if (goals.length === 0) {
      return { updated: 0, completed: 0 };
    }

    // Process goals
    let updated = 0;
    let completed = 0;

    for (const goal of goals) {
      const playerStat = await getPlayerStat(womId, goal.goal_type, goal.metric);
      const currentValue = goal.goal_type === 'skill'
        ? playerStat.experience
        : playerStat.kills;
      const isCompleted = currentValue >= goal.target_value;

      const { error: updateError } = await supabase
        .from("user_goals")
        .update({
          current_value: currentValue,
          completed: isCompleted,
          completed_date: isCompleted && !goal.completed ? new Date().toISOString() : goal.completed_date,
        })
        .eq("id", goal.id);

      if (!updateError) {
        updated++;
        if (isCompleted && !goal.completed) completed++;
      }
    }

    return { updated, completed };
  } catch (error) {
    console.error("Error updating player goals:", error);
    throw error;
  }
}
```

**Why Use Services**:
- Separate business logic from UI
- Reusable across components
- Easier to test
- Single source of truth for operations

## Error Handling Patterns

### Try-Catch with User-Friendly Messages

```javascript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (err) {
  console.error('Operation failed:', err);
  return { error: err.message || 'Operation failed' };
}
```

### Error States in UI

```javascript
function MyComponent() {
  const { data, loading, error } = useResource();

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load data"
        message={error.message}
        onRetry={refresh}
      />
    );
  }

  return <Content data={data} />;
}
```

## Loading States

### Simple Loading

```javascript
if (loading) {
  return <div>Loading...</div>;
}
```

### Skeleton Loaders (Target Pattern)

```javascript
if (loading) {
  return (
    <div className="skeleton-container">
      <Skeleton height={40} width="100%" />
      <Skeleton height={200} width="100%" />
    </div>
  );
}
```

### Loading Indicators

```javascript
import LoadingIndicator from '../components/ui/LoadingIndicator';

if (loading) {
  return <LoadingIndicator />;
}
```

## Caching Strategies

### SWR Caching
- Automatic by key
- Configurable stale time
- Background revalidation

### Manual Caching (LocalStorage)

```javascript
const CACHE_KEY = 'cached_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache() {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  // Fetch fresh data
  const data = await fetchData();

  // Update cache
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));

  return data;
}
```

## Pagination Patterns

### Offset Pagination

```javascript
const fetchPage = async (page, perPage = 20) => {
  const { data, error, count } = await supabase
    .from('table')
    .select('*', { count: 'exact' })
    .range(page * perPage, (page + 1) * perPage - 1);

  return {
    data,
    totalPages: Math.ceil(count / perPage),
    currentPage: page,
  };
};
```

### Cursor Pagination

```javascript
const fetchNextPage = async (lastId) => {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .gt('id', lastId)
    .limit(20)
    .order('id');

  return data;
};
```

## Best Practices Summary

1. **Use hooks for data fetching** - Encapsulate logic
2. **Return consistent shape** - { data, loading, error, operations }
3. **Handle errors gracefully** - User-friendly messages
4. **Use useCallback for fetch functions** - Stable references
5. **Refresh after mutations** - Keep UI in sync
6. **Admin operations via Edge Functions** - Security
7. **Use RPC for complex queries** - Performance
8. **Implement cancellation** - Prevent state updates on unmount
9. **Cache appropriately** - Balance freshness and performance
10. **Loading states for UX** - Show progress to users

## Future Improvements

1. **Migrate to React Query** - Standardize data fetching
2. **Implement optimistic updates** - Better UX
3. **Add retry logic** - Handle transient failures
4. **Better error handling** - Consistent error messages
5. **Request deduplication** - Reduce API calls
6. **Background sync** - Update data when tab is hidden
