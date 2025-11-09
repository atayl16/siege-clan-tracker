# Known Bugs & UX Issues

**Last Updated:** 2025-11-06
**Status:** Planning Document

This document tracks known bugs, UX issues, and quality problems in the Siege Clan Tracker. Each issue includes reproduction steps, impact assessment, and suggested fixes.

---

## 🔴 Critical Bugs (Must Fix)

### BUG-001: Anniversary Date Calculation Incorrect
**File:** `netlify/functions/anniversaries.js:38`
**Severity:** High
**Impact:** Wrong anniversary notifications sent

#### Description
The anniversary calculation only compares years, not the full date. This means someone who joined on Jan 1, 2023 would get an anniversary notification on Nov 6, 2024 (any date in 2024).

#### Current Code (Broken)
```javascript
// Line 38
const years = today.getFullYear() - joinDate.getFullYear();
```

#### Problem
- Only checks year difference
- Doesn't verify month and day match
- Someone who joined Dec 31, 2023 gets anniversary on Jan 1, 2024 (1 year early!)

#### Reproduction Steps
1. Add member with join_date = "2023-12-31"
2. Run anniversaries function on 2024-01-01
3. Member incorrectly gets 1-year anniversary

#### Correct Fix
```javascript
// Calculate years, but verify the anniversary date has passed
const joinDate = new Date(member.join_date);
const today = new Date();

// Check if anniversary is today
const joinMonthDay = `${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`;
const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

if (joinMonthDay !== todayMonthDay) {
  // Not their anniversary
  continue;
}

// Calculate years - this is now safe because we know it's the same month/day
let years = today.getFullYear() - joinDate.getFullYear();

// Edge case: If join date is in the future somehow, years could be negative
if (years < 0) continue;
```

#### Also Fix In
- `scripts/sync-tasks/anniversaries.cjs:46` (same issue)

#### Testing
```javascript
// Test cases
const testCases = [
  { join: '2023-11-06', today: '2024-11-06', expected: 1 }, // ✅ Correct
  { join: '2023-11-06', today: '2024-11-05', expected: null }, // ❌ Not anniversary yet
  { join: '2023-11-06', today: '2024-11-07', expected: null }, // ❌ Anniversary was yesterday
  { join: '2023-12-31', today: '2024-01-01', expected: null }, // ❌ Not anniversary
  { join: '2023-01-01', today: '2024-12-31', expected: null }, // ❌ Not anniversary
];
```

---

### BUG-002: Missing Function Reference
**File:** `src/components/admin/AdminMemberTable.jsx:249`
**Severity:** High
**Impact:** Runtime error when hiding/showing members

#### Description
`toggleMemberVisibility` function is called but never defined or imported, causing a crash when admin tries to hide/show a member.

#### Error Message
```
ReferenceError: toggleMemberVisibility is not defined
```

#### Reproduction Steps
1. Login as admin
2. Go to Admin page → Members tab
3. Expand a member row
4. Click "Hide" or "Unhide" button
5. Error occurs

#### Current Code (Broken)
```javascript
const handleToggleVisibility = async (member) => {
  try {
    setRefreshing(`visibility-${member.wom_id}`);
    await toggleMemberVisibility(member); // ❌ Not defined
    onRefresh && onRefresh();
```

#### Fix Option 1: Import from DataContext
```javascript
// At top of file
const {
  group,
  loading: womLoading,
  updateMember,
  toggleMemberVisibility, // ✅ Add this if it exists in DataContext
  refreshWomData,
} = useData();
```

#### Fix Option 2: Implement Locally
```javascript
const handleToggleVisibility = async (member) => {
  try {
    setRefreshing(`visibility-${member.wom_id}`);

    // Use updateMember instead
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

#### Testing
1. Login as admin
2. Hide a member → Verify they're hidden
3. Unhide the member → Verify they're visible
4. Check no console errors
5. Verify UI updates immediately

---

### BUG-003: Wrong Cache TTL Values
**File:** `netlify/edge-functions/user-goals.js:12`
**File:** `netlify/edge-functions/claim-requests.js:20`
**Severity:** Medium
**Impact:** Incorrect cache duration (too long)

#### Description
TTL values are 10x too large. Comment says "5 minutes" but value is 3000 (50 minutes). This causes stale data.

#### Current Code (Broken)
```javascript
// user-goals.js:12
// Cache for 5 minutes
const TTL = 3000; // ❌ This is 50 minutes!

// claim-requests.js:20
const TTL = 9000; // ❌ This is 150 minutes (2.5 hours)!
```

#### Fix
```javascript
// user-goals.js:12
// Cache for 5 minutes
const TTL = 300; // ✅ 5 minutes in seconds

// claim-requests.js:20
// Cache for 15 minutes
const TTL = 900; // ✅ 15 minutes in seconds
```

#### Impact
- User goals don't update for 50 minutes
- Claim requests don't update for 2.5 hours
- Makes the site feel "broken" to users

#### Testing
1. Create a new goal
2. Verify it appears within 5 minutes (not 50)
3. Submit a claim request
4. Verify it appears within 15 minutes (not 150)

---

### BUG-004: Wrong Cache Tag
**File:** `netlify/edge-functions/events.js:47`
**Severity:** Low
**Impact:** Cache purging affects wrong resources

#### Description
Events edge function has cache tag `supabase-members` instead of `supabase-events`, so purging member cache doesn't work correctly.

#### Current Code (Broken)
```javascript
headers: {
  'Content-Type': 'application/json',
  'Cache-Control': `public, max-age=${TTL}`,
  'CDN-Cache-Control': `public, max-age=${TTL}`,
  'Netlify-Cache-Tag': 'supabase-members', // ❌ Wrong tag
  'ETag': etag
}
```

#### Fix
```javascript
headers: {
  'Content-Type': 'application/json',
  'Cache-Control': `public, max-age=${TTL}`,
  'CDN-Cache-Control': `public, max-age=${TTL}`,
  'Netlify-Cache-Tag': 'supabase-events', // ✅ Correct tag
  'ETag': etag
}
```

#### Impact
- Purging events cache doesn't work
- Purging members cache incorrectly purges events too

---

### BUG-005: Module Export Mismatch
**File:** `netlify/functions/anniversaries.js:156`
**Severity:** Medium
**Impact:** Function may not work when imported

#### Description
File uses CommonJS (`require`) but exports with ES6 syntax (`export`), causing potential import errors.

#### Current Code (Broken)
```javascript
// Top of file uses CommonJS
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Bottom of file uses ES6
export { sendAnniversaries }; // ❌ Mismatch
```

#### Fix
```javascript
// Use CommonJS consistently
module.exports = { sendAnniversaries }; // ✅ Matches require()
```

#### Testing
```bash
# Test the function
node netlify/functions/anniversaries.js
```

---

## 🟡 High Priority Bugs

### BUG-006: No API Key Authentication
**Files:** All edge functions
**Severity:** High (Security)
**Impact:** Public APIs can be abused

#### Description
Edge functions have no authentication. Anyone can call them and access data.

#### Current State
```javascript
// No authentication check
export default async (request, _context) => {
  // Anyone can call this
  const data = await supabase.from('members').select('*');
  return new Response(JSON.stringify(data));
}
```

#### Fix (from TASKS.md)
Add API key middleware:
```javascript
export default async (request, _context) => {
  // Check API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = Deno.env.get('API_KEY');

  // Allow requests from same origin without key
  const origin = request.headers.get('Origin') || request.headers.get('Referer');
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com';

  if (!origin?.includes(allowedOrigin) && apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Rest of function...
}
```

#### Files to Fix
- All 11 edge functions in `netlify/edge-functions/`

---

### BUG-007: Wildcard CORS
**Files:** All edge functions
**Severity:** Medium (Security)
**Impact:** Anyone can call APIs from any domain

#### Current Code
```javascript
'Access-Control-Allow-Origin': '*' // ❌ Too permissive
```

#### Fix
```javascript
'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siege-clan.com'
```

---

### BUG-008: SQL Injection Risk
**File:** `scripts/sync-tasks/wom-events.cjs:585`
**Severity:** High (Security)
**Impact:** Potential SQL injection

#### Description
Username query uses string concatenation instead of parameterized queries.

#### Current Code (Potentially Vulnerable)
```javascript
// If usernames are concatenated into SQL
const usernames = participants.map(p => p.username).join(',');
const query = `SELECT * FROM members WHERE name IN (${usernames})`; // ❌ SQL injection risk
```

#### Fix
```javascript
// Use parameterized query
const { data } = await supabase
  .from('members')
  .select('*')
  .in('name', participants.map(p => p.username)); // ✅ Safe
```

#### Note
Need to verify exact code at line 585 to confirm issue.

---

## 🟢 Medium Priority Bugs

### BUG-009: Missing Error CORS Headers
**Files:** Multiple edge functions
**Severity:** Low
**Impact:** Error responses blocked by browser CORS

#### Description
Error responses don't include CORS headers, so errors don't reach the client properly.

#### Current Code
```javascript
catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500, headers: { 'Content-Type': 'application/json' } } // ❌ No CORS
  );
}
```

#### Fix
```javascript
catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
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

#### Files to Fix
- `netlify/functions/discord.js`
- `netlify/functions/events.js:21`
- `netlify/functions/members.js`

---

### BUG-010: Missing JSON Parsing Error Handling
**File:** `netlify/functions/discord.js`
**Severity:** Medium
**Impact:** Crashes on malformed JSON

#### Description
No try-catch around `JSON.parse(event.body)`.

#### Current Code
```javascript
const body = JSON.parse(event.body); // ❌ Could crash
```

#### Fix
```javascript
let body;
try {
  body = JSON.parse(event.body);
} catch (err) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Invalid JSON' })
  };
}
```

---

### BUG-011: Player ID Not Validated
**File:** `netlify/edge-functions/wom-player.js`
**Severity:** Low
**Impact:** Could pass invalid ID to WOM API

#### Description
Player ID from URL isn't validated before passing to WOM API.

#### Current Code
```javascript
const playerId = context.params.id; // Could be anything
const response = await fetch(`${WOM_API}/players/${playerId}`); // ❌ Not validated
```

#### Fix
```javascript
const playerId = context.params.id;

// Validate it's numeric
if (!/^\d+$/.test(playerId)) {
  return new Response(
    JSON.stringify({ error: 'Invalid player ID' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const response = await fetch(`${WOM_API}/players/${playerId}`);
```

---

## 🎨 UX Issues

### UX-001: Confusing "Coming Soon" Placeholders
**File:** `src/pages/ProfilePage.jsx`
**Severity:** Medium
**Impact:** Users confused by disabled features

#### Description
Profile page shows disabled fields for email, Discord, and password change with "Coming Soon" text. This confuses users who think these features should work.

#### Current State
- Email input field (disabled)
- Discord name field (disabled)
- "Change Password" button (disabled)
- All say "Coming Soon"

#### User Confusion
- "Why can't I add my email?"
- "When will this be available?"
- "Is this broken?"

#### Fix Options

**Option 1: Remove Entirely** (Recommended)
```javascript
// Remove these sections until they're implemented
// Don't show disabled features
```

**Option 2: Clear Messaging**
```jsx
<Card variant="info">
  <Card.Body>
    <h5>Email & Discord Integration</h5>
    <p>Email and Discord features are planned for a future update.
       For now, use your username to login.</p>
  </Card.Body>
</Card>
```

**Option 3: Make Functional**
- Actually implement email and Discord features
- Takes more time but better UX

#### Recommended Action
Remove the incomplete sections. Don't show features that don't work.

---

### UX-002: Missing Claim Request Management in Admin
**File:** `src/pages/AdminPage.jsx`
**Severity:** Medium
**Impact:** Admins can't approve claim requests easily

#### Description
ClaimRequestManager component exists but isn't integrated into the admin panel tabs. Admins have no easy way to see and approve pending claims.

#### Current State
- Component exists: `src/components/ClaimRequestManager.jsx`
- Not used in AdminPage
- Admins manually handle claims

#### Fix
Add ClaimRequestManager to admin tabs:

```javascript
// AdminPage.jsx
import ClaimRequestManager from "../components/ClaimRequestManager";

const tabs = [
  { id: "members", label: "Members", icon: FaUsers },
  { id: "alerts", label: "Rank Alerts", icon: FaBell },
  { id: "runewatch", label: "RuneWatch", icon: FaExclamationTriangle },
  { id: "claims", label: "Claim Requests", icon: FaFlag }, // ✅ Add this
];

// In render:
{activeTab === "claims" && (
  <ClaimRequestManager />
)}
```

#### Impact
- Makes admin workflow much easier
- Claims get processed faster
- Better user experience for new members

---

### UX-003: No Loading States
**Files:** Various components
**Severity:** Low
**Impact:** User doesn't know if page is loading or broken

#### Description
Some components don't show loading indicators. Page appears frozen while data loads.

#### Examples
- Member table loads without indicator
- Event page shows nothing while loading
- Profile page blank during fetch

#### Fix
Add loading states to all data-dependent components:

```jsx
if (loading) {
  return <LoadingIndicator message="Loading members..." />;
}

if (error) {
  return <EmptyState
    icon={FaExclamationTriangle}
    message="Failed to load data"
    action={<Button onClick={retry}>Retry</Button>}
  />;
}

return <ActualContent />;
```

---

### UX-004: No Feedback on Actions
**Files:** Various
**Severity:** Low
**Impact:** User doesn't know if action succeeded

#### Description
Many admin actions (edit member, delete member, hide member) don't show success/failure messages.

#### Current State
- Click "Delete" → Member disappears
- No confirmation it worked
- No error if it failed

#### Fix
Add toast notifications:

```javascript
try {
  await deleteMember(member.wom_id);
  showToast(`Successfully deleted ${member.name}`, 'success');
} catch (error) {
  showToast(`Failed to delete ${member.name}: ${error.message}`, 'error');
}
```

#### Alternative
Use existing toast in AdminMemberTable (line 219) for all actions.

---

### UX-005: Hard to Distinguish Hidden Members
**File:** `src/components/admin/AdminMemberTable.jsx`
**Severity:** Low
**Impact:** Hard to see which members are hidden

#### Description
Hidden members have different styling but it's subtle. Easy to miss.

#### Current Styling
```css
.ui-hidden-member-row {
  opacity: 0.6;
}
```

#### Improved Styling
```css
.ui-hidden-member-row {
  opacity: 0.5;
  background-color: #2a2a2a !important;
  border-left: 3px solid #dc3545;
}

.ui-hidden-member-row::before {
  content: "HIDDEN";
  position: absolute;
  right: 10px;
  background: #dc3545;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}
```

---

### UX-006: Search Not Debounced
**File:** `src/pages/AdminPage.jsx`
**Severity:** Low
**Impact:** Search filters on every keystroke (performance)

#### Description
Member search filters immediately on every key press. For large member lists, this could be slow.

#### Current Code
```javascript
const handleSearchChange = (e) => {
  const value = e.target.value;
  setSearchTerm(value); // Immediate filter
  // ... URL update
};
```

#### Fix
Add debouncing:

```javascript
import { useDebounce } from '../hooks/useDebounce';

function AdminPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Use debouncedSearch for filtering
  useEffect(() => {
    // Filter with debouncedSearch
  }, [debouncedSearch, members]);
}
```

---

### UX-007: No Empty States
**Files:** Various list components
**Severity:** Low
**Impact:** Blank screen when no data

#### Description
When lists are empty, page shows nothing instead of helpful message.

#### Fix
Add empty state components:

```jsx
{filteredMembers.length === 0 && (
  <EmptyState
    icon={FaUsers}
    title="No members found"
    message={searchTerm
      ? `No members match "${searchTerm}"`
      : "No members in the clan yet"
    }
    action={searchTerm && (
      <Button onClick={clearSearch}>Clear Search</Button>
    )}
  />
)}
```

---

### UX-008: Mobile Navigation Issues
**Files:** `src/components/Navbar.jsx`
**Severity:** Medium
**Impact:** Hard to navigate on mobile

#### Description
Mobile menu is functional but could be improved:
- Small touch targets
- Hard to close
- Doesn't indicate current page

#### Improvements
1. Larger touch targets (48px minimum)
2. Close menu on navigation
3. Highlight active page
4. Slide-in animation instead of dropdown

---

### UX-009: No Confirmation on Destructive Actions
**Files:** Various admin components
**Severity:** Medium
**Impact:** Accidental deletions

#### Description
Delete member only uses browser `confirm()` dialog. Easy to click through.

#### Current Code
```javascript
if (!window.confirm(`Are you sure you want to delete ${member.name}?`)) {
  return;
}
```

#### Better UX
Custom confirmation modal:

```jsx
<Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
  <Modal.Header>
    <h4>Delete Member</h4>
  </Modal.Header>
  <Modal.Body>
    <p>Are you sure you want to delete <strong>{member.name}</strong>?</p>
    <p className="text-danger">This action cannot be undone.</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleConfirmDelete}>
      Delete Member
    </Button>
  </Modal.Footer>
</Modal>
```

---

### UX-010: Rank Mismatch Not Obvious
**File:** `src/components/admin/AdminMemberTable.jsx`
**Severity:** Low
**Impact:** Admins might miss members needing rank updates

#### Description
Members with incorrect ranks show a warning icon, but it's small and easy to miss in a long list.

#### Current Display
- Small ⚠️ icon next to rank
- Suggestion shown on hover
- Easy to overlook

#### Improvements
1. **Dedicated Alert Tab** (already exists - good!)
2. **Color-code entire row**
   ```css
   .ui-role-mismatch-row {
     background-color: #3a2a1a; /* Orange-ish tint */
     border-left: 4px solid #ffc107;
   }
   ```
3. **Bold incorrect rank**
   ```css
   .ui-role-mismatch-row .ui-role-value {
     font-weight: bold;
     color: #ffc107;
   }
   ```

---

## 📊 Priority Summary

| Severity | Count | Must Fix | Should Fix | Nice to Have |
|----------|-------|----------|------------|--------------|
| Critical Bugs | 5 | 5 | 0 | 0 |
| High Priority | 3 | 3 | 0 | 0 |
| Medium Priority | 3 | 0 | 3 | 0 |
| UX Issues | 10 | 0 | 5 | 5 |
| **TOTAL** | **21** | **8** | **8** | **5** |

---

## 🔧 Fix Priority Order

### Week 1: Critical Bugs (Must Fix)
1. BUG-001: Anniversary calculation ⚠️ URGENT
2. BUG-002: Missing toggleMemberVisibility ⚠️ URGENT
3. BUG-003: Wrong TTL values
4. BUG-004: Wrong cache tag
5. BUG-005: Module export mismatch

### Week 2: Security Issues (Must Fix)
6. BUG-006: Add API key authentication
7. BUG-007: Fix wildcard CORS
8. BUG-008: SQL injection risk

### Week 3: High-Value UX Issues
9. UX-001: Remove "Coming Soon" placeholders
10. UX-002: Add ClaimRequestManager to admin panel
11. UX-009: Better delete confirmation
12. UX-004: Add action feedback (toasts)

### Week 4: Medium Priority
13. BUG-009: Missing error CORS
14. BUG-010: JSON parsing errors
15. UX-003: Add loading states
16. UX-007: Add empty states

### Later: Polish
17. All remaining UX issues
18. Performance optimizations
19. Mobile improvements

---

## 🧪 Testing Checklist

### After Each Fix:
- [ ] Manual testing in browser
- [ ] Check browser console for errors
- [ ] Test on mobile
- [ ] Test as admin
- [ ] Test as regular user
- [ ] Test as non-logged-in user

### Before Deployment:
- [ ] All critical bugs fixed
- [ ] No new bugs introduced
- [ ] Performance not degraded
- [ ] Security issues addressed
- [ ] User experience improved

---

## 📝 Bug Report Template

For tracking new bugs found:

```markdown
### BUG-XXX: Brief Description
**File:** path/to/file.js:line
**Severity:** Critical/High/Medium/Low
**Impact:** What breaks?

#### Description
What's the problem?

#### Reproduction Steps
1. Step 1
2. Step 2
3. Error occurs

#### Current Code (Broken)
```javascript
// Show the bug
```

#### Fix
```javascript
// Show the solution
```

#### Testing
How to verify the fix works
```

---

## 🎯 Success Metrics

Track these after fixes are deployed:

- **Error Rate:** Monitor Sentry/console errors
- **Load Time:** Faster with better caching
- **User Complaints:** Should decrease
- **Admin Efficiency:** Faster workflows
- **Mobile Usage:** Improved with UX fixes

---

**Last Updated:** 2025-11-06
**Next Review:** After critical bugs are fixed
