# Technical Debt & Code Refactoring

**Last Updated:** 2025-11-06
**Status:** Planning Document

This document tracks technical debt, code quality issues, and refactoring opportunities in the Siege Clan Tracker codebase. Items are organized by priority and include specific file locations and implementation suggestions.

---

## 🔴 Critical Priority

### 1. Remove Dead Code Files
**Impact:** High - Reduces bundle size, improves maintainability
**Effort:** Low - Simple deletion
**Risk:** Low

#### Files to Remove:
- **`src/context/DataContext-OLD.js`** (1,320 lines)
  - Old version of DataContext that's no longer used
  - Current version is `src/context/DataContext.js`
  - Verify no imports reference this file before deletion

- **`scripts/import-legacy-player-data.js`** (if exists)
  - One-time migration script no longer needed
  - Already mentioned in TASKS.md

- **`scripts/update-siege-scores.js`** (if exists)
  - Manual script with hardcoded data
  - Already mentioned in TASKS.md

**Steps:**
```bash
# 1. Search for any imports
grep -r "DataContext-OLD" src/
grep -r "import-legacy-player-data" .
grep -r "update-siege-scores" .

# 2. If no results, safe to delete
git rm src/context/DataContext-OLD.js
git rm scripts/import-legacy-player-data.js
git rm scripts/update-siege-scores.js
```

---

### 2. Remove Unused Dependencies
**Impact:** Medium - Reduces bundle size, eliminates confusion
**Effort:** Low
**Risk:** Low

#### Dependencies to Remove:

**`swr` (v2.3.3)** - `package.json:26`
- Application migrated to React Query (@tanstack/react-query)
- SWR is no longer used anywhere in the codebase
- Saving ~50KB in bundle size

**Potentially Unused:**
- **`cheerio`** (v1.0.0) - HTML parsing library
  - Search codebase to verify if used
  - May have been used in legacy scraping code

- **`pako`** (v2.1.0) - Compression library
  - Verify usage in codebase
  - May be unused after refactoring

- **`sql.js`** (v1.13.0) - SQLite library
  - Using Supabase (PostgreSQL), not SQLite
  - Likely can be removed

**Steps:**
```bash
# 1. Verify SWR is not used
grep -r "useSWR" src/
grep -r "from 'swr'" src/

# 2. Check other dependencies
grep -r "cheerio" src/ netlify/ scripts/
grep -r "pako" src/ netlify/ scripts/
grep -r "sql.js" src/ netlify/ scripts/

# 3. Remove unused ones
npm uninstall swr cheerio pako sql.js

# 4. Test the application
npm run build
npm test
```

---

### 3. Fix Module Export Inconsistencies
**Impact:** High - Prevents runtime errors
**Effort:** Low
**Risk:** Low

#### File: `netlify/functions/anniversaries.js:156`

**Issue:**
```javascript
// Currently (wrong - mixing CommonJS and ES6):
export { sendAnniversaries };
```

**Fix:**
```javascript
// Should be (CommonJS):
module.exports = { sendAnniversaries };
```

**Why:** The file uses `require()` at the top, so it's a CommonJS module, not ES6.

**Testing:**
```bash
# Test locally
node netlify/functions/anniversaries.js
```

---

### 4. Fix Missing Function Reference
**Impact:** High - Causes runtime errors
**Effort:** Medium
**Risk:** Medium

#### File: `src/components/admin/AdminMemberTable.jsx:249`

**Issue:**
```javascript
const handleToggleVisibility = async (member) => {
  try {
    setRefreshing(`visibility-${member.wom_id}`);
    await toggleMemberVisibility(member); // ❌ Function not defined
    onRefresh && onRefresh();
```

**Problem:** `toggleMemberVisibility` is called but never imported or defined.

**Fix:** Import from the correct location:
```javascript
// At top of file:
import { useData } from "../../context/DataContext";

// In component:
const {
  group,
  loading: womLoading,
  updateMember,
  toggleMemberVisibility, // ✅ Add this
  refreshWomData,
} = useData();
```

**Alternative:** If function doesn't exist in DataContext, implement it:
```javascript
const handleToggleVisibility = async (member) => {
  try {
    setRefreshing(`visibility-${member.wom_id}`);
    await updateMember({
      wom_id: member.wom_id,
      hidden: !member.hidden
    });
    onRefresh && onRefresh();
  } catch (err) {
    console.error("Error toggling visibility:", err);
    alert("Failed to update visibility");
  } finally {
    setRefreshing(null);
  }
};
```

---

## 🟡 High Priority

### 5. Consolidate Duplicate Logic
**Impact:** Medium - Improves maintainability
**Effort:** Medium
**Risk:** Low

#### Areas with Duplication:

**A. Name Normalization**
- Found in multiple sync scripts
- Found in components

**Create:** `src/utils/nameUtils.js`
```javascript
/**
 * Normalize a player name for comparison
 * @param {string} name - Player name
 * @returns {string} Normalized name
 */
export function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[_\s-]/g, '');
}

/**
 * Check if two names match (case-insensitive, ignoring special chars)
 */
export function namesMatch(name1, name2) {
  return normalizeName(name1) === normalizeName(name2);
}
```

**B. Date Formatting**
- Repeated date formatting across components
- Inconsistent formats

**Create:** `src/utils/dateUtils.js`
```javascript
/**
 * Format date for display (Nov 6, 2024)
 */
export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date with time (Nov 6, 2024, 3:45 PM)
 */
export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

/**
 * Get month-day for anniversary matching (MM-DD)
 */
export function getMonthDay(date) {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

**C. Rank Calculation Logic**
- Duplicated in AdminMemberTable and RankAlerts

**Centralize in:** `src/utils/rankUtils.js` (already exists, verify completeness)

---

### 6. Rename .js Files Containing JSX
**Impact:** Low - Improves IDE experience
**Effort:** Low
**Risk:** Low

**Files to Rename:**
- All files in `src/` that contain JSX should have `.jsx` extension
- Helps IDEs provide better syntax highlighting and linting

**Check:**
```bash
# Find .js files with JSX
find src -name "*.js" -not -path "*/node_modules/*" -exec grep -l "return.*<" {} \;

# For each file found, rename:
git mv src/path/file.js src/path/file.jsx

# Update all imports
```

---

### 7. Add JSDoc Comments to Utilities
**Impact:** Medium - Improves developer experience
**Effort:** Medium
**Risk:** None

#### Files Needing Documentation:

**Priority 1 (most used):**
- `src/utils/stringUtils.js`
- `src/utils/rankUtils.js`
- `src/utils/supabaseClient.js`
- `src/utils/adminApi.js`

**Template:**
```javascript
/**
 * Converts string to title case
 * @param {string} str - Input string
 * @returns {string} Title-cased string
 * @example
 * titleize('hello world') // 'Hello World'
 */
export function titleize(str) {
  // implementation
}
```

---

### 8. Improve Error Handling in Edge Functions
**Impact:** High - Better debugging in production
**Effort:** Medium
**Risk:** Low

#### Add to ALL Edge Functions:

**Current Pattern (incomplete):**
```javascript
catch (error) {
  console.error('Function error:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Improved Pattern:**
```javascript
catch (error) {
  console.error('Function error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  return new Response(
    JSON.stringify({
      error: error.message,
      ...(Deno.env.get('ENVIRONMENT') === 'development' && { stack: error.stack })
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*'
      }
    }
  );
}
```

**Files to Update:**
- `netlify/edge-functions/members.js`
- `netlify/edge-functions/events.js`
- `netlify/edge-functions/users.js`
- `netlify/edge-functions/claim-requests.js`
- `netlify/edge-functions/user-goals.js`
- `netlify/edge-functions/races.js`
- All WOM proxy functions

---

### 9. Remove Debug Logs from Production Code
**Impact:** Low - Cleaner console output
**Effort:** Low
**Risk:** None

#### Files with Debug Logs:

**`netlify/functions/members.js:10-14`**
- Remove unnecessary console.logs
- Keep error logs, remove debug logs

**Pattern:**
```javascript
// ❌ Remove these:
console.log("Fetching members data from Supabase...");
console.log("Response:", response);

// ✅ Keep these:
console.error('Function error:', error);
```

**Strategy:**
- Use environment-based logging
- Keep error logs always
- Remove info logs from production

---

## 🟢 Medium Priority

### 10. Standardize Component File Structure
**Impact:** Low - Improves consistency
**Effort:** Medium
**Risk:** Low

**Current Issue:** Inconsistent component organization

**Proposed Structure:**
```javascript
// 1. Imports (grouped)
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// External libraries
// Local components
// Local hooks
// Local utils
// Styles

// 2. Constants
const CACHE_TTL = 300;

// 3. Helper functions (outside component)
function calculateRank(xp) { ... }

// 4. Component
export default function ComponentName({ prop1, prop2 }) {
  // 4a. Hooks
  const [state, setState] = useState();

  // 4b. Effects
  useEffect(() => { ... }, []);

  // 4c. Event handlers
  const handleClick = () => { ... };

  // 4d. Render helpers
  const renderItem = (item) => { ... };

  // 4e. Return JSX
  return ( ... );
}

// 5. PropTypes (if not using TypeScript)
ComponentName.propTypes = {
  prop1: PropTypes.string.required,
  prop2: PropTypes.number
};
```

---

### 11. Extract Magic Numbers to Constants
**Impact:** Medium - Improves maintainability
**Effort:** Medium
**Risk:** Low

**Examples Found:**

**Rank Thresholds** - `AdminMemberTable.jsx:109-116`
```javascript
// ❌ Current (magic numbers):
if (clanXp >= 500000000) correctRole = "zenyte";
else if (clanXp >= 150000000) correctRole = "onyx";

// ✅ Better:
const RANK_THRESHOLDS = {
  SKILLER: {
    ZENYTE: 500_000_000,
    ONYX: 150_000_000,
    DRAGONSTONE: 90_000_000,
    DIAMOND: 40_000_000,
    RUBY: 15_000_000,
    EMERALD: 8_000_000,
    SAPPHIRE: 3_000_000,
    OPAL: 0
  },
  FIGHTER: {
    TZKAL: 1500,
    MONARCH: 1300,
    SENATOR: 1100,
    EXECUTIVE: 900,
    SUPERIOR: 700,
    SUPERVISOR: 500,
    LEADER: 300,
    PREFECT: 100,
    MENTOR: 0
  }
};
```

**Cache TTL Values**
```javascript
// Create: src/constants/cache.js
export const CACHE_TTL = {
  MEMBERS: 300,      // 5 minutes
  EVENTS: 300,       // 5 minutes
  USERS: 300,        // 5 minutes
  CLAIM_REQUESTS: 900,   // 15 minutes
  USER_GOALS: 3000,      // 50 minutes
  RACES: 900         // 15 minutes
};
```

---

### 12. Implement Consistent Error Messages
**Impact:** Medium - Better UX
**Effort:** Low
**Risk:** None

**Create:** `src/constants/messages.js`
```javascript
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',

  // Auth errors
  UNAUTHORIZED: 'You must be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',

  // Data errors
  NOT_FOUND: 'The requested item was not found.',
  INVALID_DATA: 'Invalid data provided. Please check your input.',

  // Member operations
  MEMBER_DELETE_FAILED: (name) => `Failed to delete ${name}. Please try again.`,
  MEMBER_UPDATE_FAILED: (name) => `Failed to update ${name}. Please try again.`,

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export const SUCCESS_MESSAGES = {
  MEMBER_DELETED: (name) => `Successfully deleted ${name}.`,
  MEMBER_UPDATED: (name) => `Successfully updated ${name}.`,
  POINTS_ADDED: (points, name) => `Added ${points} points to ${name}.`,
};
```

**Usage:**
```javascript
import { ERROR_MESSAGES } from '../constants/messages';

catch (error) {
  alert(ERROR_MESSAGES.MEMBER_DELETE_FAILED(member.name));
}
```

---

### 13. Improve Component Prop Validation
**Impact:** Low - Catches bugs earlier
**Effort:** Medium
**Risk:** None

**Option A: Add PropTypes**
```javascript
import PropTypes from 'prop-types';

AdminMemberTable.propTypes = {
  members: PropTypes.arrayOf(PropTypes.shape({
    wom_id: PropTypes.number.required,
    name: PropTypes.string,
    siege_score: PropTypes.number
  })).required,
  onEditClick: PropTypes.func.required,
  onDeleteClick: PropTypes.func.required,
  onRefresh: PropTypes.func
};
```

**Option B: Migrate to TypeScript** (larger effort)
- Convert `.jsx` → `.tsx`
- Add interface definitions
- Better long-term solution

---

### 14. Extract Inline Styles to CSS Modules
**Impact:** Low - Improves consistency
**Effort:** Medium
**Risk:** Low

**Current Issue:** Some components have inline styles mixed with CSS files

**Example:**
```javascript
// ❌ Current:
<div style={{ marginTop: '20px', padding: '10px' }}>

// ✅ Better:
<div className={styles.container}>

// In .module.css:
.container {
  margin-top: 20px;
  padding: 10px;
}
```

---

## 🔵 Low Priority (Nice to Have)

### 15. Add Code Comments for Complex Logic
**Impact:** Low - Improves understanding
**Effort:** Low
**Risk:** None

**Areas Needing Comments:**
- Rank calculation logic in `AdminMemberTable.jsx`
- Anniversary date matching in `anniversaries.js`
- Event points calculation in `wom-events.cjs`
- WOM data sync logic

---

### 16. Standardize Naming Conventions
**Impact:** Low
**Effort:** Medium
**Risk:** Low

**Current Issues:**
- Some files use `kebab-case`, others use `PascalCase`
- Some variables use `snake_case`, others use `camelCase`

**Proposed Standards:**
- **Files:** `PascalCase.jsx` for components, `camelCase.js` for utilities
- **Variables:** `camelCase` always
- **Constants:** `UPPER_SNAKE_CASE`
- **CSS Classes:** `kebab-case` or `camelCase` (BEM methodology)
- **Database:** `snake_case` (already consistent)

---

### 17. Extract Toast Notification Logic
**Impact:** Low - Code reusability
**Effort:** Low
**Risk:** None

**Current:** Toast creation in `AdminMemberTable.jsx:219-228`

**Create:** `src/utils/toast.js`
```javascript
export function showToast(message, type = 'success', duration = 2000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}
```

**Better:** Use a proper toast library like `react-hot-toast` or `react-toastify`

---

### 18. Add Loading Skeletons
**Impact:** Low - Better UX
**Effort:** Medium
**Risk:** None

**Current:** Generic loading spinners

**Better:** Skeleton screens that match the content shape
- Use `react-loading-skeleton` or create custom
- Improves perceived performance

---

### 19. Optimize React Renders
**Impact:** Medium (performance)
**Effort:** Medium
**Risk:** Low

**Opportunities:**
- Add `React.memo()` to components that re-render unnecessarily
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for function props

**Example:**
```javascript
// Heavy component that doesn't need to re-render often:
export default React.memo(AdminMemberTable, (prevProps, nextProps) => {
  return prevProps.members === nextProps.members;
});
```

**Profile first:**
```javascript
// Use React DevTools Profiler to identify re-render issues
```

---

### 20. Extract Reusable Hooks
**Impact:** Low - Code reusability
**Effort:** Low
**Risk:** None

**Potential Custom Hooks:**

**`useLocalStorage`**
```javascript
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

**`useDebounce`** - For search inputs
```javascript
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 📊 Summary Statistics

| Priority | Count | Total Effort | Total Risk |
|----------|-------|-------------|-----------|
| 🔴 Critical | 4 | Low-Medium | Low-Medium |
| 🟡 High | 5 | Medium | Low |
| 🟢 Medium | 10 | Medium-High | Low |
| 🔵 Low | 6 | Medium | None-Low |
| **TOTAL** | **25** | **High** | **Low** |

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
- Remove dead code (#1)
- Remove unused dependencies (#2)
- Fix module exports (#3)
- Fix missing function (#4)

### Phase 2: Code Quality (3-5 days)
- Consolidate duplicate logic (#5)
- Add JSDoc comments (#7)
- Improve error handling (#8)
- Remove debug logs (#9)

### Phase 3: Refactoring (1-2 weeks)
- Standardize component structure (#10)
- Extract magic numbers (#11)
- Consistent error messages (#12)
- Prop validation (#13)

### Phase 4: Polish (ongoing)
- All low priority items
- Performance optimizations
- Extract reusable hooks

---

## Testing Checklist

After each refactoring task:

- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual smoke test in browser
- [ ] Check for console errors
- [ ] Verify no regressions in functionality

---

## Notes

- **Always create a branch** for refactoring work
- **Test thoroughly** before merging
- **One task at a time** - don't combine unrelated refactoring
- **Document breaking changes** if any
- **Update this file** as items are completed

**Last Review:** 2025-11-06
**Next Review:** After completing Phase 1
