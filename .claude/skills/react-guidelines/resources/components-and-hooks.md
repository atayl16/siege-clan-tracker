# Components and Hooks Patterns

## Component Structure Patterns

### Observed Component Patterns

#### 1. Basic Functional Component with Props
**Example**: [Button.jsx](../../../src/components/ui/Button.jsx)

```javascript
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  icon,
  iconPosition = 'left',
  square = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  // Build class names from props
  const buttonClasses = [
    'ui-button',
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth ? 'ui-button-full-width' : '',
    square ? 'ui-button-square' : '',
    disabled ? 'ui-button-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  // Filter non-DOM props to avoid React warnings
  const { fullWidth: _, ...buttonProps } = props;

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...buttonProps}
    >
      {icon && iconPosition === 'left' && (
        <span className="ui-button-icon ui-button-icon-left">{icon}</span>
      )}
      {!square && children}
      {icon && iconPosition === 'right' && (
        <span className="ui-button-icon ui-button-icon-right">{icon}</span>
      )}
    </button>
  );
};
```

**Key Observations**:
- Default values provided in destructuring
- Array-based className building with `filter(Boolean).join(' ')`
- Filtering custom props before spreading to DOM (`const { fullWidth: _, ...buttonProps } = props`)
- Conditional rendering based on props

#### 2. Compound Component Pattern
**Example**: [Card.jsx](../../../src/components/ui/Card.jsx)

```javascript
export default function Card({
  children,
  className = "",
  variant = "default",
  hover = false,
  clickable = false,
  ...props
}) {
  return (
    <div
      className={`ui-card ui-card-${variant} ${hover ? 'ui-card-hover' : ''} ${clickable ? 'ui-card-clickable' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Sub-components defined as properties
Card.Header = function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-header ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-body ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-footer ${className}`} {...props}>
      {children}
    </div>
  );
};
```

**Usage**:
```javascript
<Card variant="default" hover>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

**Key Observations**:
- Sub-components attached to parent as properties
- Each sub-component is a named function (for better debugging)
- Consistent prop pattern across all sub-components

#### 3. Page Component with Multiple Hooks
**Example**: [ProfilePage.jsx](../../../src/pages/ProfilePage.jsx:57-91)

```javascript
export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("characters");
  const [showCreateRace, setShowCreateRace] = useState(false);

  // Multiple custom hooks for data
  const { userClaims, refreshUserClaims } = useClaimRequests(user?.id);
  const { activeRaces, loading: racesLoading, refreshRaces } = useRaces(user?.id);

  // Event handlers
  const handleCreatedRace = () => {
    setShowCreateRace(false);
    refreshRaces();
  };

  // Computed values (memoized for complex operations)
  const userCharacterRaces = activeRaces
    ? activeRaces.filter((race) => {
        if (race.creator_id === user?.id) return true;
        const userCharacterIds = userClaims.map((claim) => claim.members.wom_id);
        return race.participants?.some((participant) =>
          userCharacterIds.includes(participant.player_id)
        );
      })
    : [];

  // Effects for data fetching
  useEffect(() => {
    if (user) {
      refreshUserClaims();
    }
  }, [user, refreshUserClaims]);

  // Multiple returns for different states
  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <div className="profile-container">
      {/* Component JSX */}
    </div>
  );
}
```

**Key Observations**:
- Multiple custom hooks for data fetching
- Local state for UI state only
- Computed values inline (could be memoized)
- Early returns for different states
- Effects depend on stable references (use useCallback in hooks)

#### 4. Complex Component with useMemo
**Example**: [Leaderboard.jsx](../../../src/components/Leaderboard.jsx:17-77)

```javascript
export default function SiegeLeaderboard({
  members = [],
  limit = null,
  className = "",
  showTitle = false,
  compact = false,
  loading = false,
  type = "score",
  title = null,
  events = [],
}) {
  const leaderboardData = useMemo(() => {
    if (type === "score") {
      // Complex computation for score leaderboard
      return [...members]
        .map((member) => ({
          ...member,
          siege_score: parseInt(member.siege_score || member.score, 10) || 0,
        }))
        .filter((member) => member.siege_score > 0)
        .sort((a, b) => b.siege_score - a.siege_score)
        .slice(0, limit || members.length);
    } else if (type === "wins") {
      // Complex computation for wins leaderboard
      const winCounts = {};
      const currentMemberNames = new Set(
        members.map((m) => (m.name || m.wom_name || "").toLowerCase())
      );

      // ... complex logic ...

      return sortedWinners;
    }
    return [];
  }, [members, limit, type, events]);

  // Rest of component
}
```

**Key Observations**:
- `useMemo` for expensive computations
- All dependencies properly listed
- Complex logic extracted into memoized value
- Returns different data structures based on `type` prop

#### 5. Component with TanStack Table
**Example**: [MemberTable.jsx](../../../src/components/MemberTable.jsx:197-242)

```javascript
export default function MemberTable({ filteredMembers = null }) {
  const { members: allMembers, loading: membersLoading } = useMembers();
  const { groupData, loading: groupLoading } = useGroup();
  const [expandedRow, setExpandedRow] = useState(null);

  const members = filteredMembers || allMembers;

  // Enhance members with fresh WOM data
  const enhancedMembers = useMemo(() => {
    if (!members || !groupData?.memberships) return members;

    const womMembersMap = {};
    groupData.memberships.forEach((membership) => {
      if (membership.player?.id) {
        womMembersMap[membership.player.id] = {
          ...membership.player,
          role: membership.role,
        };
      }
    });

    return members.map((member) => {
      const womMember = member.wom_id ? womMembersMap[member.wom_id] : null;
      if (womMember) {
        return {
          ...member,
          current_xp: womMember.latestSnapshot?.data?.skills?.overall?.experience || member.current_xp,
          current_lvl: womMember.latestSnapshot?.data?.skills?.overall?.level || member.current_lvl,
          // ... more fields
        };
      }
      return member;
    });
  }, [members, groupData]);

  // Column definitions
  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        // Complex cell rendering
      },
    },
    // ... more columns
  ], [expandedRow]);

  const table = useReactTable({
    data: sortedMembers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="ui-table-container">
      <table className="ui-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Key Observations**:
- TanStack Table for complex tables
- Multiple data sources merged together
- Column definitions memoized to prevent re-renders
- Expandable rows with local state

## Hook Patterns

### Custom Hook Pattern 1: Supabase Data Hook
**Example**: [useMembers.js](../../../src/hooks/useMembers.js:29-60)

```javascript
export function useMembers() {
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch function with useCallback to prevent infinite loops
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

      if (fetchError) {
        throw fetchError;
      }

      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // CRUD operations
  const createMember = async (memberData) => {
    // ... create logic ...
    fetchMembers(); // Refresh after mutation
    return data[0];
  };

  const updateMember = async (memberData) => {
    // ... update logic ...
    await fetchMembers(); // Refresh after mutation
    return result.data;
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
    // ... more operations
  };
}
```

**Key Observations**:
- Returns object with data, loading, error, and operations
- `useCallback` for fetch function to stabilize reference
- Manual loading and error state management
- CRUD operations included in hook
- Refresh after mutations

### Custom Hook Pattern 2: SWR Data Hook
**Example**: [useClaimRequests.js](../../../src/hooks/useClaimRequests.js:1-19)

```javascript
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useClaimRequests() {
  const { data, error, mutate } = useSWR("/api/claim-requests", fetcher, {
    refreshInterval: 60000,        // Auto-refresh every minute
    dedupingInterval: 30000,       // Dedupe requests within 30s
    revalidateOnMount: true,       // Fetch on mount
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

**Key Observations**:
- Very simple compared to manual hooks
- SWR handles caching, deduplication, revalidation
- Configuration options for refresh behavior
- Consistent return shape with other hooks

### Custom Hook Pattern 3: Context Hook
**Example**: [AuthContext.jsx](../../../src/context/AuthContext.jsx:546)

```javascript
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("adminAuth") === "true"
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const [loading, setLoading] = useState(true);

  // Operations
  const login = async (username, password) => {
    // ... login logic ...
  };

  const logout = () => {
    // ... logout logic ...
  };

  // ... more operations ...

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        // ... more values
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the context
export const useAuth = () => useContext(AuthContext);
```

**Key Observations**:
- Context for truly global state (auth)
- Custom hook wrapper for cleaner usage
- Operations included in context value
- State synchronized with localStorage

## Component Composition

### Tabs Component Pattern
**Example**: [ProfilePage.jsx](../../../src/pages/ProfilePage.jsx:192-339) using [Tabs.jsx](../../../src/components/ui/Tabs.jsx)

```javascript
<Tabs activeTab={activeTab} onChange={setActiveTab} className="profile-tabs">
  <Tabs.Tab tabId="characters" label="Characters" icon={<FaUser />}>
    {/* Tab content */}
  </Tabs.Tab>

  <Tabs.Tab tabId="goals" label="Goals" icon={<FaFlag />}>
    {/* Tab content */}
  </Tabs.Tab>

  <Tabs.Tab tabId="races" label="Races" icon={<FaTrophy />}>
    {/* Tab content */}
  </Tabs.Tab>
</Tabs>
```

### Empty State Pattern
**Example**: [ProfilePage.jsx](../../../src/pages/ProfilePage.jsx:209-213)

```javascript
<EmptyState
  title="No Characters Yet"
  description="You haven't claimed any characters yet. Click 'Claim New Character' to get started."
  icon={<FaUser />}
  action={
    <Button variant="primary" onClick={handleAction}>
      Claim New Character
    </Button>
  }
/>
```

### Loading Pattern
```javascript
if (loading) {
  return <LoadingIndicator />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

return <ActualContent data={data} />;
```

## Prop Patterns

### Common Prop Types
- `className`: Additional CSS classes
- `variant`: Style variant ("primary", "secondary", etc.)
- `loading`: Loading state
- `disabled`: Disabled state
- `onClick`: Click handler
- `children`: Child components

### Prop Filtering for DOM Elements
```javascript
// Extract custom props that shouldn't be on DOM
const {
  fullWidth,
  customProp,
  anotherCustomProp,
  ...domProps
} = props;

return <div {...domProps}>Content</div>;
```

## Common Patterns Summary

1. **All components are functional** - No classes
2. **Prop destructuring with defaults** - Every component
3. **Sub-component pattern** - Card, Tabs, StatGroup
4. **useMemo for expensive computations** - Leaderboard, MemberTable
5. **useCallback for stable function references** - Custom hooks
6. **Early returns for loading/error states** - Most page components
7. **Conditional className building** - Button, Card, most UI components
8. **Custom hooks return { data, loading, error, operations }** - Consistent interface
9. **Effects use stable dependencies** - useCallback prevents infinite loops
10. **Filter custom props before spreading** - Prevents React warnings
