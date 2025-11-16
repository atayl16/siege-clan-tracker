# Supabase Auth Implementation Checklist

Use this checklist to track your implementation progress.

## Pre-Implementation

- [ ] Read `AUTH_SOLUTION_SUMMARY.md` - Understand the solution
- [ ] Review `AUTH_ARCHITECTURE.txt` - Understand the architecture
- [ ] Backup current database
  ```sql
  -- In Supabase SQL Editor:
  SELECT * FROM public.users;
  -- Copy/export results
  ```
- [ ] Test current system works (baseline)
- [ ] Decide on user migration strategy (re-register vs. programmatic)
- [ ] Set up staging/test environment (recommended)

## Phase 1: Database Migrations (30 min)

- [ ] Navigate to Supabase Dashboard > SQL Editor
- [ ] Run Migration 1: `20250116000001_prepare_auth_migration.sql`
  - [ ] Verify: `\d public.users` shows email column
  - [ ] Verify: password_hash is nullable
- [ ] Run Migration 2: `20250116000002_auto_create_users.sql`
  - [ ] Verify trigger exists:
    ```sql
    SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
    ```
- [ ] Run Migration 3: `20250116000003_auth_rls_policies.sql`
  - [ ] Verify policies exist:
    ```sql
    SELECT policyname FROM pg_policies WHERE tablename = 'users';
    ```
- [ ] Run Migration 4: `20250116000004_admin_helper_functions.sql`
  - [ ] Verify functions exist:
    ```sql
    SELECT proname FROM pg_proc
    WHERE proname IN ('handle_new_user', 'is_admin', 'get_user_by_email');
    ```

### Verification Queries
```sql
-- Should return 3 rows
SELECT proname, prokind FROM pg_proc
WHERE proname IN ('handle_new_user', 'is_admin', 'get_user_by_email');

-- Should return 5 policies
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'users';

-- Should return 1 trigger
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

## Phase 2: Netlify Function (15 min)

- [ ] Copy `netlify/functions/auth-login-with-username.js` to your project
- [ ] Verify environment variables in `.env`:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ALLOWED_ORIGINS`
- [ ] Test function locally:
  ```bash
  netlify dev
  # In another terminal:
  curl -X POST http://localhost:8888/.netlify/functions/auth-login-with-username \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  ```
- [ ] Commit function:
  ```bash
  git add netlify/functions/auth-login-with-username.js
  git commit -m "Add username login edge function"
  ```
- [ ] Deploy to Netlify:
  ```bash
  netlify deploy --prod
  ```
- [ ] Verify in Netlify Dashboard:
  - [ ] Function appears in Functions list
  - [ ] Environment variables are set

## Phase 3: Frontend Updates (20 min)

### Update AuthContext
- [ ] Backup current `src/context/AuthContext.jsx`
  ```bash
  cp src/context/AuthContext.jsx src/context/AuthContext.jsx.backup
  ```
- [ ] Replace with new AuthContext from `SUPABASE_AUTH_SOLUTION.md`
- [ ] Remove `import { sha256 } from "crypto-hash"` if present
- [ ] Verify no compilation errors:
  ```bash
  npm run dev
  ```

### Update Admin Helpers
- [ ] Open `netlify/functions/utils/adminHelpers.js`
- [ ] Find the `validateAuth()` function (around line 100)
- [ ] Change line ~104:
  ```javascript
  // OLD:
  .eq('supabase_auth_id', user.id)

  // NEW:
  .eq('id', user.id)
  ```
- [ ] Save and commit:
  ```bash
  git add netlify/functions/utils/adminHelpers.js
  git commit -m "Update admin validation to use id instead of supabase_auth_id"
  ```

### Verify No Breaking Changes
- [ ] `Login.jsx` - should work as-is (uses username)
- [ ] `RegistrationForm.jsx` - should work as-is (uses username)
- [ ] No changes needed to UI components

## Phase 4: Testing (30 min)

### Test 1: User Registration
- [ ] Navigate to `/register`
- [ ] Register new user: username=`testuser1`, password=`Test123!`
- [ ] Should redirect to profile page
- [ ] Verify in Supabase Dashboard:
  - [ ] Go to Authentication > Users
  - [ ] Should see: `testuser1@siege-clan.app`
  - [ ] Go to Table Editor > users
  - [ ] Should see record with:
    - username: testuser1
    - email: testuser1@siege-clan.app
    - is_admin: false
    - id and supabase_auth_id match

### Test 2: User Login
- [ ] Logout
- [ ] Navigate to `/login`
- [ ] Login with username=`testuser1`, password=`Test123!`
- [ ] Should redirect to profile
- [ ] Verify session in DevTools:
  - [ ] Open Application > Local Storage
  - [ ] Should NOT see old keys (adminAuth, userId, user)
  - [ ] Supabase session should be active
- [ ] Refresh page
- [ ] Should still be logged in

### Test 3: Admin Promotion
- [ ] In Supabase SQL Editor:
  ```sql
  UPDATE public.users
  SET is_admin = true
  WHERE username = 'testuser1';

  -- Verify
  SELECT username, is_admin FROM public.users
  WHERE username = 'testuser1';
  ```
- [ ] Should show is_admin = true

### Test 4: Admin Access
- [ ] Logout and login again as testuser1
- [ ] Navigate to `/admin`
- [ ] Should have access to admin panel
- [ ] Try hiding a member:
  - [ ] Open DevTools > Network tab
  - [ ] Click hide on any member
  - [ ] Verify request has `Authorization: Bearer [token]` header
  - [ ] Should return 200 OK
  - [ ] Member should be hidden

### Test 5: Non-Admin Protection
- [ ] Register second user: username=`testuser2`, password=`Test123!`
- [ ] Try to navigate to `/admin`
- [ ] Should be denied or redirected
- [ ] In console, try:
  ```javascript
  const { data, error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('id', user.id);
  console.log(error);
  ```
- [ ] Should show permission denied error

### Test 6: Edge Function Validation
- [ ] As admin (testuser1), open DevTools > Network
- [ ] Perform admin action (hide member, toggle admin, etc.)
- [ ] Verify:
  - [ ] Request has `Authorization: Bearer ...` header
  - [ ] Response is 200 OK
  - [ ] No CORS errors
- [ ] As non-admin (testuser2), try same action
- [ ] Should return 403 Forbidden

### Test 7: Session Persistence
- [ ] Login as testuser1
- [ ] Refresh page
- [ ] Should stay logged in
- [ ] Close tab
- [ ] Reopen site
- [ ] Should stay logged in (for ~1 hour)
- [ ] After token expires, should be logged out

### Test 8: Logout
- [ ] Click logout
- [ ] Should redirect to home/login
- [ ] Verify in DevTools:
  - [ ] No Supabase session
  - [ ] No localStorage data
- [ ] Try to access `/admin`
- [ ] Should be denied

## Phase 5: Production Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] No errors in browser console
- [ ] No errors in Netlify function logs
- [ ] Database migrations applied
- [ ] Environment variables set in Netlify

### Deployment
- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "Implement Supabase Auth solution"
  ```
- [ ] Push to production branch:
  ```bash
  git push origin main
  ```
- [ ] Monitor Netlify deploy
- [ ] Verify functions deployed successfully

### Post-Deployment Verification
- [ ] Test registration in production
- [ ] Test login in production
- [ ] Test admin promotion in production
- [ ] Test admin functions in production
- [ ] Monitor logs for errors
- [ ] Check Supabase logs for issues

## Phase 6: User Migration (If Needed)

### Option A: Users Re-register
- [ ] Announce migration to users
- [ ] Provide deadline
- [ ] Clear communication about data preservation
- [ ] Manual claim transfer (if needed)

### Option B: Programmatic Migration
- [ ] Create migration script (example in `AUTH_IMPLEMENTATION_GUIDE.md`)
- [ ] Test on staging first
- [ ] Migrate users in batches
- [ ] Send password reset emails
- [ ] Monitor for issues

### Option C: Gradual Migration
- [ ] Keep old login code temporarily
- [ ] On old-style login, migrate user to new system
- [ ] Log them in with new session
- [ ] Remove old code after X days

## Phase 7: Cleanup

- [ ] Remove old password hashing code
- [ ] Remove unused imports (`sha256`, etc.)
- [ ] Remove old localStorage keys handling
- [ ] Remove backup files
- [ ] Update documentation
- [ ] (Optional) Drop password_hash column:
  ```sql
  -- After all users migrated
  ALTER TABLE public.users DROP COLUMN password_hash;
  ```

## Troubleshooting Checklist

If something goes wrong:

- [ ] Check browser console for errors
- [ ] Check Netlify function logs: `netlify functions:log`
- [ ] Check Supabase logs in dashboard
- [ ] Verify environment variables are set
- [ ] Verify database migrations applied
- [ ] Try rolling back to backup
- [ ] Review `AUTH_IMPLEMENTATION_GUIDE.md` troubleshooting section

## Rollback Procedure (If Needed)

- [ ] Revert AuthContext:
  ```bash
  git checkout HEAD~1 src/context/AuthContext.jsx
  ```
- [ ] Remove edge function:
  ```bash
  git rm netlify/functions/auth-login-with-username.js
  ```
- [ ] Deploy:
  ```bash
  git commit -m "Rollback auth changes"
  git push origin main
  ```
- [ ] Database changes are backwards compatible (can keep them)

## Success Criteria

You know it's working when:

- [x] New users can register with username
- [x] User records auto-created in both tables
- [x] Users can login with username
- [x] Sessions persist on refresh
- [x] Admin promotion is one SQL command
- [x] Admin functions work without errors
- [x] Non-admins get 403 on admin actions
- [x] Logout clears session properly
- [x] No authentication errors in logs

## Final Verification

- [ ] All tests in Phase 4 passing
- [ ] No errors in logs
- [ ] Admin panel working
- [ ] User experience unchanged (username login)
- [ ] Performance is good (login <500ms)
- [ ] Security checklist complete:
  - [ ] Service role key not exposed
  - [ ] JWT validation working
  - [ ] RLS policies active
  - [ ] Column-level security on is_admin
  - [ ] CORS properly configured

## Documentation

- [ ] Update README if needed
- [ ] Document admin promotion procedure
- [ ] Add notes about new auth system
- [ ] Archive old documentation
- [ ] Keep these solution docs for reference

## Post-Implementation

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify user satisfaction
- [ ] Plan for future enhancements:
  - [ ] Password reset flow?
  - [ ] Email verification?
  - [ ] OAuth providers?
  - [ ] Two-factor authentication?

## Notes

Use this space for implementation-specific notes:

```
Date started: _______________
Date completed: _______________

Issues encountered:
-
-
-

Solutions:
-
-
-

Lessons learned:
-
-
-
```

## Support Resources

- **Complete Solution**: `SUPABASE_AUTH_SOLUTION.md`
- **Implementation Guide**: `AUTH_IMPLEMENTATION_GUIDE.md`
- **Quick Reference**: `AUTH_QUICK_REFERENCE.md`
- **Architecture**: `AUTH_ARCHITECTURE.txt`
- **This Checklist**: `AUTH_IMPLEMENTATION_CHECKLIST.md`

## Contacts

- Supabase Support: support@supabase.com
- Netlify Support: support@netlify.com
- Documentation: https://supabase.com/docs

---

**Implementation Status**: [ ] Not Started | [ ] In Progress | [ ] Complete

**Last Updated**: _____________

**Implemented By**: _____________
