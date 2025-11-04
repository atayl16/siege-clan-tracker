# Siege Clan Tracker - Stabilization Tasks

**Last Updated:** November 4, 2024
**Status:** In Progress - Waiting for PR #36 fixes

---

## 📊 Overall Progress

- [x] Initial codebase analysis complete
- [x] Function audit complete
- [x] Supabase CLI setup complete
- [x] Project linked to Supabase
- [ ] PR #36 fixes complete (Claude Code cloud)
- [ ] Migrations applied
- [ ] Manual setup tasks complete
- [ ] All PRs created and tested

---

## 🔥 URGENT: Prerequisites

### ✅ Already Done
- [x] Supabase CLI installed via Homebrew
- [x] Logged in to Supabase (`supabase login`)
- [x] Project linked (`supabase link --project-ref xshjeogimlzltdjpeejp`)
- [x] Database password reset
- [x] Supabase config.toml created (set to major_version = 15)
- [x] Migration files created

### ⏸️ Waiting On
- [ ] **PR #36 CodeRabbit fixes from Claude Code cloud** - IN PROGRESS
  - Waiting to ensure no migration changes needed
  - Once complete, review for any database requirement changes

---

## 🤖 CLAUDE CODE CLOUD PROMPTS

### Prompt #0: Original PR (Already Running)
**Status:** 🟡 IN PROGRESS
**Branch:** `stabilization-fixes` (or similar)
**PR:** https://github.com/atayl16/siege-clan-tracker/pull/36

This is fixing the test bugs from PR #35. Once complete, we'll proceed with the rest.

---

### Prompt #1: Critical Function Security Fixes
**Status:** ⏸️ WAITING (do after Prompt #0 completes)
**Priority:** URGENT
**Risk Level:** HIGH - Production security issues

<details>
<summary>Click to expand prompt</summary>

```
CRITICAL SECURITY & BUG FIXES FOR NETLIFY FUNCTIONS

You need to fix critical security vulnerabilities and bugs in the Netlify functions. These are production issues affecting active users.

## Part 1: Security - Add API Key Authentication

Create a new middleware pattern for API authentication:

1. Add API key validation to these edge functions:
   - netlify/edge-functions/members.js
   - netlify/edge-functions/events.js
   - netlify/edge-functions/users.js
   - netlify/edge-functions/claim-requests.js
   - netlify/edge-functions/user-goals.js
   - netlify/edge-functions/races.js

Pattern to use:
- Check for `x-api-key` header
- Compare against `Deno.env.get('API_KEY')`
- Allow requests without key from same origin (check Origin/Referer header matches your domain)
- Return 401 if invalid

2. Fix CORS from wildcard to specific domain:
   - Replace `'Access-Control-Allow-Origin': '*'`
   - Use: `'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://siegeclan.com'`
   - Keep credentials: false

## Part 2: Fix Critical Bugs

1. **netlify/functions/anniversaries.js** (Lines 156):
   - Change `export { sendAnniversaries }` to `module.exports = { sendAnniversaries }`
   - Fix date calculation (line 38): Check month+day before calculating years
   - Add UTC timezone handling

2. **scripts/sync-tasks/anniversaries.cjs** (Line 46):
   - Fix years calculation to verify full date not just year difference

3. **netlify/edge-functions/user-goals.js** (Line 20):
   - Fix TTL from 3000 to 300 (5 minutes, not 50 minutes)

4. **netlify/edge-functions/claim-requests.js** (Line 20):
   - Fix TTL from 9000 to 900 (15 minutes, not 150 minutes)

5. **netlify/edge-functions/events.js** (Line 47):
   - Fix cache tag from 'supabase-members' to 'supabase-events'

6. **scripts/sync-tasks/wom-events.cjs** (Line 585):
   - Fix SQL injection risk in username query
   - Use proper escaping or parameterized query for username list

## Part 3: Improve Error Handling

1. **netlify/functions/discord.js**:
   - Add JSON parsing try-catch around `JSON.parse(event.body)`
   - Add CORS headers to error responses

2. **netlify/functions/events.js**:
   - Add CORS headers to error response (line 21)

3. **netlify/functions/members.js**:
   - Remove debug logs (lines 10-14)
   - Add CORS headers to error responses

## Part 4: Input Validation

1. **netlify/edge-functions/wom-player.js**:
   - Validate player ID is numeric before passing to API
   - Return 400 if invalid

BE VERY CAREFUL: These functions are in production. Test thoroughly. Make sure you don't break existing functionality.

Create a PR called "security-and-bug-fixes" with these changes.
```

</details>

**After this PR:**
- [ ] Review on Netlify preview
- [ ] Check for breaking changes
- [ ] Test edge functions still work

---

### Prompt #2: Simplified Supabase Architecture
**Status:** ⏸️ WAITING
**Priority:** HIGH
**Dependencies:** Migrations must be applied first

<details>
<summary>Click to expand prompt</summary>

```
IMPLEMENT SIMPLIFIED SUPABASE ARCHITECTURE

The admin operations currently fail because getAdminSupabaseClient() doesn't properly use the service role key. We're fixing this by moving ALL admin operations to edge functions that use the service role key server-side.

## Part 1: Create Admin Edge Functions

Create these new edge functions in netlify/edge-functions/:

### 1. admin-update-member.js
- Accepts: POST with { womId, updates } in body
- Validates: Admin session (check x-admin-token header)
- Uses: SERVICE_ROLE_KEY client
- Calls: admin_update_member RPC function
- Returns: Updated member or error

### 2. admin-delete-member.js
- Accepts: DELETE with { womId } in body
- Validates: Admin session
- Uses: SERVICE_ROLE_KEY client
- Calls: admin_delete_member RPC function
- Returns: Success or error

### 3. admin-toggle-visibility.js
- Accepts: POST with { womId, hidden } in body
- Validates: Admin session
- Uses: SERVICE_ROLE_KEY client
- Calls: admin_toggle_member_visibility RPC function
- Returns: Updated member

### 4. admin-toggle-user-admin.js
- Accepts: POST with { userId, isAdmin } in body
- Validates: Admin session (must be master admin)
- Uses: SERVICE_ROLE_KEY client
- Calls: admin_toggle_user_admin RPC function
- Returns: Updated user

## Part 2: Update Frontend Components

Update these files to call the new edge functions:

1. **src/components/admin/AdminMemberTable.jsx**:
   - Replace direct Supabase calls in handleEditMember (line ~400)
   - Replace direct Supabase calls in handleDeleteMember (line ~420)
   - Replace RPC call in handleToggleVisibility with edge function

2. **src/components/admin/AdminUserManager.jsx**:
   - Replace toggleAdminStatus function (line ~80)
   - Use admin-toggle-user-admin edge function

## Part 3: Simplify Auth

1. **src/utils/supabaseClient.js**:
   - Remove getAdminSupabaseClient() function entirely (it doesn't work anyway)
   - Document that admin operations now use edge functions

2. **src/context/AuthContext.js**:
   - Add adminToken to auth state (generate on admin login)
   - Store adminToken in localStorage
   - Pass adminToken in x-admin-token header for admin edge function calls

## Part 4: Add Admin Edge Function Helper

Create src/utils/adminApi.js with helper functions:
- updateMember(womId, updates)
- deleteMember(womId)
- toggleMemberVisibility(womId, hidden)
- toggleUserAdmin(userId, isAdmin)

All should include adminToken from localStorage in headers.

## Testing Plan:
1. Test on Netlify preview deployment
2. Verify admin can edit members
3. Verify admin can delete members
4. Verify admin can hide/show members
5. Verify admin can promote/demote other admins
6. Verify non-admins get 401 errors

Create a PR called "simplified-admin-architecture" with these changes.
```

</details>

**After this PR:**
- [ ] Test all admin operations on preview
- [ ] Verify security (non-admins blocked)
- [ ] Check console for errors

---

### Prompt #3: GitHub Actions Workflow Fixes
**Status:** ⏸️ WAITING
**Priority:** MEDIUM

<details>
<summary>Click to expand prompt</summary>

```
FIX GITHUB ACTIONS WORKFLOWS

The workflows have several issues causing silent failures and incomplete coverage.

## Part 1: Fix Workflow Error Handling

For all three workflow files (.github/workflows/):

1. **daily-clan-sync.yml**:
   - Set `continue-on-error: false` for critical jobs (anniversary, runewatch)
   - Remove unused conditional logic (lines 23, 33 - github.event.inputs doesn't exist)
   - Add WOM sync and events jobs (currently missing)

2. **hourly-clan-sync.yml**:
   - Set `continue-on-error: false` for wom-sync and wom-events
   - Remove unused conditional logic

3. **manual-clan-sync.yml**:
   - Set `continue-on-error: false` for all jobs except optional ones
   - Make WOM_GROUP_ID consistent (use secrets.WOM_GROUP_ID only, not vars)
   - Ensure all jobs get necessary environment variables
   - Simplify run-name logic (replace nested ternary with clearer naming)

## Part 2: Reorganize Workflow Coverage

**Recommended schedule:**
- **Hourly**: WOM member sync, WOM events sync (high-priority data)
- **Daily**: Anniversaries, RuneWatch (once-per-day checks)
- **Manual**: All jobs individually selectable

Update workflows to match this pattern.

## Part 3: Add Workflow Notifications

Add a final step to each workflow that sends a Discord notification on failure:
- Use DISCORD_WEBHOOK_URL from secrets
- Include workflow name, job name, and error details
- Only triggers on failure

This ensures you know when sync jobs fail.

Create a PR called "fix-github-workflows" with these changes.
```

</details>

**After this PR:**
- [ ] Manually trigger workflows to test
- [ ] Verify Discord notifications work
- [ ] Check that failures don't continue silently

---

### Prompt #4: Code Structure Cleanup
**Status:** ⏸️ WAITING
**Priority:** MEDIUM

<details>
<summary>Click to expand prompt</summary>

```
CODE STRUCTURE CLEANUP

Clean up technical debt and improve code organization.

## Part 1: Remove Dead Code

1. Delete src/context/DataContext-OLD.js (1,320 lines of unused code)
2. Delete scripts/import-legacy-player-data.js (one-time migration script, no longer needed)
3. Delete scripts/update-siege-scores.js (manual script with hardcoded data)

## Part 2: Remove SWR Dependency

1. Remove `swr` from package.json dependencies
2. Search codebase for any remaining `useSWR` imports
3. Replace any SWR usage with React Query patterns
4. Update all hooks to use React Query only

## Part 3: Improve Profile Page UX

In src/pages/ProfilePage.jsx:

1. Remove "Coming Soon" placeholders for incomplete features:
   - Email field (line ~338)
   - Discord name field
   - Change Password button

Replace with clear messaging:
- "Email and Discord integration not yet implemented"
- Or remove these sections entirely
- Don't show disabled buttons that confuse users

## Part 4: Integrate Claim Request Manager

In src/pages/AdminPage.jsx:

1. Add a new tab called "Claim Requests"
2. Import and render ClaimRequestManager component
3. Add to the admin navigation tabs
4. This lets admins approve/deny pending character claims

## Part 5: Fix Module Inconsistencies

1. Rename .js files that contain JSX to .jsx for consistency
2. Ensure all component files use consistent naming
3. Add comments to complex utility functions

## Part 6: Consolidate Duplicate Logic

Review and consolidate:
1. Name normalization logic (appears in multiple scripts)
2. Date formatting utilities
3. Rank calculation logic (if duplicated)

Create helper utilities in src/utils/ for shared logic.

Create a PR called "code-cleanup-and-structure" with these changes.
```

</details>

**After this PR:**
- [ ] Run tests to ensure nothing broke
- [ ] Check bundle size decreased
- [ ] Verify admin page has claim requests tab

---

### Prompt #5: README & Documentation
**Status:** ⏸️ WAITING
**Priority:** LOW (Nice to have)

<details>
<summary>Click to expand prompt</summary>

```
UPDATE README AND ADD DOCUMENTATION

The README is basic and the codebase lacks documentation for developers.

## Part 1: Update README.md

Rewrite to include:

### Project Overview
- What this site does (OSRS clan tracker)
- Technologies used (React, Vite, Supabase, Netlify)
- Key features (member tracking, goals, races, competitions)

### Architecture
- Frontend: React with React Query for state
- Database: Supabase (PostgreSQL)
- Hosting: Netlify (with edge functions)
- APIs: WiseOldMan for OSRS data

### Local Development Setup
- Prerequisites (Node.js version, npm)
- Environment variables needed
- Installation steps
- Running locally with `npm run netlify:dev`
- Running tests with `npm test`

### Deployment
- Automatic deployment via Netlify from main branch
- Preview deployments for PRs
- Environment variables configuration

### Project Structure
```
/src - React frontend
  /components - Reusable components
  /pages - Route components
  /hooks - Custom React hooks
  /context - Context providers
  /utils - Utilities
/netlify
  /functions - Serverless functions (Node.js)
  /edge-functions - Edge functions (Deno)
/scripts - Background sync jobs
/.github/workflows - Automated sync tasks
```

### Key Concepts
- WiseOldMan integration and caching
- Siege Score system
- Character claiming flow
- Admin operations

## Part 2: Create CONTRIBUTING.md

Add guide for future contributions:
- Code style guidelines
- How to add new features
- Testing requirements
- PR process

## Part 3: Create ARCHITECTURE.md

Document:
- How admin authentication works
- Edge function caching strategy
- Database schema (export current schema and include)
- RLS policies
- Background job schedule

## Part 4: Add Inline Documentation

Add JSDoc comments to key functions:
- All utility functions in src/utils/
- Complex hooks in src/hooks/
- Admin edge functions

Create a PR called "documentation-improvements" with these changes.
```

</details>

**After this PR:**
- [ ] Read through documentation
- [ ] Verify accuracy
- [ ] Update any outdated info

---

## 📋 MANUAL SETUP TASKS

### Task 1: Set Up Staging Database
**Status:** ⏸️ READY TO START
**Estimated Time:** 15 minutes
**Priority:** HIGH (do before migrations!)

**Why First:** Test all changes on staging before touching production!

**Steps:**
1. [ ] Go to https://app.supabase.com
2. [ ] Create new project: "siege-clan-tracker-staging"
3. [ ] Save database password somewhere secure
4. [ ] Copy staging credentials (Settings > API):
   - Project URL
   - anon public key
   - service_role key
5. [ ] Create `.env.staging` file with staging credentials
6. [ ] Link to staging: `supabase link --project-ref STAGING-REF`
7. [ ] Apply migrations to staging: `supabase db push`
8. [ ] Export production data: `npm run staging:export`
9. [ ] Seed staging database: `npm run staging:seed`
10. [ ] Test staging works by browsing data in Supabase dashboard

**Reference:** See [STAGING_SETUP.md](STAGING_SETUP.md) for detailed instructions

---

### Task 2: Apply Migrations to Staging (Test First!)
**Status:** ⏸️ WAITING (after Task 1)
**Estimated Time:** 5 minutes
**Priority:** HIGH

**Steps:**
1. [ ] Wait for PR #36 fixes to be complete
2. [ ] Review migrations for any needed changes
3. [ ] Link to staging:
   ```bash
   supabase link --project-ref YOUR-STAGING-REF
   ```
4. [ ] Apply to staging FIRST:
   ```bash
   supabase db push
   ```
5. [ ] Verify with: `./supabase/verify-setup.sh`
6. [ ] Test admin operations on staging
7. [ ] If successful, apply to production:
   ```bash
   supabase link --project-ref xshjeogimlzltdjpeejp
   supabase db push
   ```

**Files:**
- Migration 1: `supabase/migrations/20250104000001_create_admin_rpc_functions.sql`
- Migration 2: `supabase/migrations/20250104000002_setup_rls_policies.sql`

---

### Task 3: Configure Netlify for Staging + Production
**Status:** ⏸️ WAITING (after Task 1)
**Estimated Time:** 20 minutes
**Priority:** HIGH

**Steps:**

**A. Add Staging Credentials:**
1. [ ] Go to Netlify dashboard
2. [ ] Site settings > Environment variables
3. [ ] For **SUPABASE_URL**:
   - Production scope: `https://xshjeogimlzltdjpeejp.supabase.co`
   - Deploy Preview scope: `https://[staging-ref].supabase.co`
   - Branch Deploy scope: `https://[staging-ref].supabase.co`
4. [ ] Repeat for **SUPABASE_ANON_KEY** (different values per scope)
5. [ ] Repeat for **SUPABASE_SERVICE_ROLE_KEY** (different values per scope)

**B. Add New Variables:**
```
API_KEY=<generate 32-char random string>
ALLOWED_ORIGIN=https://siegeclan.com
ADMIN_SECRET=<generate 32-char random string>
STAGING_SUPABASE_URL=https://[staging-ref].supabase.co
STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging service key>
```

**C. Verify Existing:**
```
WOM_GROUP_ID=2928
WOM_API_KEY=<your key>
DISCORD_WEBHOOK_URL=<your webhook>
```

**Generate random strings:**
```bash
# Run in terminal to generate random keys
openssl rand -hex 32
```

**Reference:** See [STAGING_SETUP.md](STAGING_SETUP.md) section 4

---

### Task 4: Update Frontend with API Key
**Status:** ⏸️ WAITING (after Prompt #1 and Task 3)
**Estimated Time:** 10 minutes
**Priority:** MEDIUM

**Steps:**
1. [ ] Add to your local `.env` file (for development):
   ```
   VITE_API_KEY=<same value as Netlify API_KEY>
   ```
2. [ ] Update all edge function calls in frontend to include header:
   ```javascript
   headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
   ```
3. [ ] Test locally with `npm run netlify:dev`

---

### Task 5: Add Monitoring (BetterStack + Sentry)
**Status:** ⏸️ WAITING
**Estimated Time:** 20 minutes
**Priority:** MEDIUM

**BetterStack (Uptime Monitoring):**
1. [ ] Sign up: https://betterstack.com/ (free tier)
2. [ ] Add uptime monitor for: https://siegeclan.com
3. [ ] Set check interval: 5 minutes
4. [ ] Add notification: Your email or Discord webhook

**Sentry (Error Tracking):**
1. [ ] Sign up: https://sentry.io/ (free tier)
2. [ ] Create new React project
3. [ ] Add to package.json: `npm install @sentry/react`
4. [ ] Add Sentry DSN to Netlify env vars: `VITE_SENTRY_DSN`
5. [ ] Initialize in `src/index.jsx`:
   ```javascript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     integrations: [
       Sentry.browserTracingIntegration(),
       Sentry.replayIntegration(),
     ],
     tracesSampleRate: 1.0,
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   });
   ```

---

### Task 6: Export Database Schema
**Status:** ⏸️ WAITING (after migrations applied)
**Estimated Time:** 30 minutes
**Priority:** MEDIUM

**Steps:**
1. [ ] Export full schema:
   ```bash
   supabase db dump -f supabase/backup-schema-$(date +%Y%m%d).sql
   ```
2. [ ] Export just structure (no data):
   ```bash
   supabase db dump --schema-only -f supabase/schema-only.sql
   ```
3. [ ] Document RLS policies manually:
   - Open Supabase dashboard
   - For each table, go to "Policies" tab
   - Copy policy definitions into `supabase/RLS_POLICIES.md`
4. [ ] Commit all files to git:
   ```bash
   git add supabase/
   git commit -m "Add database schema and RLS policy documentation"
   ```

---

### Task 7: Verify GitHub Actions Secrets
**Status:** ⏸️ WAITING (before testing workflows)
**Estimated Time:** 10 minutes
**Priority:** MEDIUM

**Steps:**
1. [ ] Go to: https://github.com/atayl16/siege-clan-tracker/settings/secrets/actions
2. [ ] Verify these secrets exist:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - WOM_API_KEY
   - WOM_GROUP_ID
   - DISCORD_WEBHOOK_URL
3. [ ] Add any missing ones

---

### Task 8: Comprehensive Testing
**Status:** ⏸️ WAITING (after all PRs merged)
**Estimated Time:** 1 hour
**Priority:** HIGH

**Public Pages:**
- [ ] Test https://siegeclan.com/members
- [ ] Test https://siegeclan.com/events
- [ ] Test https://siegeclan.com/leaderboard
- [ ] Test https://siegeclan.com/stats
- [ ] Check for console errors

**User Features:**
- [ ] Test registration
- [ ] Test login
- [ ] Test character claiming with code
- [ ] Test character claim request
- [ ] Test creating a goal
- [ ] Test creating a race

**Admin Features:**
- [ ] Login as admin
- [ ] Test editing a member
- [ ] Test deleting a member (use test data!)
- [ ] Test hiding/showing a member
- [ ] Test promoting user to admin
- [ ] Test demoting admin to user
- [ ] Check claim requests tab exists

**Background Jobs:**
- [ ] Manually trigger workflows
- [ ] Check Discord notifications work
- [ ] Verify data syncs properly

**Monitoring:**
- [ ] Confirm BetterStack shows site as up
- [ ] Check Sentry dashboard for errors
- [ ] Test triggering an alert

---

## 🗓️ Timeline & Order of Execution

### Phase 1: PR Fixes & Security (Week 1)
1. ✅ Wait for Prompt #0 (PR #36 fixes) - IN PROGRESS
2. ⏸️ Task 1: Apply migrations
3. ⏸️ Task 2: Add Netlify env vars
4. ⏸️ Run Prompt #1 (Security fixes)
5. ⏸️ Task 3: Update frontend with API keys

### Phase 2: Admin Architecture (Week 1-2)
6. ⏸️ Run Prompt #2 (Simplified Supabase)
7. ⏸️ Test admin operations thoroughly

### Phase 3: Workflow & Cleanup (Week 2)
8. ⏸️ Run Prompt #3 (Workflow fixes)
9. ⏸️ Task 6: Verify GitHub secrets
10. ⏸️ Run Prompt #4 (Code cleanup)

### Phase 4: Operations (Week 2-3)
11. ⏸️ Task 4: Add monitoring
12. ⏸️ Task 5: Export schema
13. ⏸️ Run Prompt #5 (Documentation)

### Phase 5: Final Testing (Week 3)
14. ⏸️ Task 7: Comprehensive testing
15. ⏸️ Merge all PRs to main
16. ⏸️ Final production verification

---

## 📊 Summary Statistics

**Total PRs to Create:** 6 (1 in progress + 5 pending)
**Total Manual Tasks:** 7
**Estimated Total Time:** 8-12 hours (spread over 2-3 weeks)
**Critical Issues Fixed:** 3 (CORS, no auth, SQL injection)
**High Priority Issues:** 8
**Medium Priority Issues:** 27

---

## 🚨 Known Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking admin operations | HIGH | Test on Netlify preview first |
| API key exposure | HIGH | Never commit .env, use secrets |
| Database migration failure | HIGH | Have backup, test in staging |
| Workflow failure unnoticed | MEDIUM | Add Discord notifications |
| Users affected by changes | MEDIUM | Deploy during low-traffic hours |

---

## 📝 Notes & Decisions

- **Database Choice:** Staying with Supabase - issues are architectural, not platform
- **Auth Approach:** Simplified to edge functions only (bypassing client-side RLS)
- **State Management:** Consolidating to React Query only (removing SWR)
- **Security Priority:** API keys required for all public endpoints
- **Testing Strategy:** Netlify preview deployments before each merge

---

## ✅ Completed Items Archive

- [x] Initial codebase exploration
- [x] Function and workflow audit
- [x] Supabase CLI setup
- [x] Database password reset
- [x] Project linking
- [x] Migration file creation
- [x] Config.toml creation
- [x] Analysis of PR #36

---

**Last Activity:** Waiting for PR #36 fixes from Claude Code cloud
**Next Action:** Review PR #36 when complete, then apply migrations
