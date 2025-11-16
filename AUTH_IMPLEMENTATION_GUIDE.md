# Supabase Auth Implementation Guide

## Quick Start

This guide walks you through implementing the new Supabase Auth system step-by-step.

## Prerequisites

- Supabase project set up
- Netlify account with functions enabled
- Local development environment running

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Apply Database Migrations

Run these migrations in order from the Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor
# Execute each migration file in order:

1. supabase/migrations/20250116000001_prepare_auth_migration.sql
2. supabase/migrations/20250116000002_auto_create_users.sql
3. supabase/migrations/20250116000003_auth_rls_policies.sql
4. supabase/migrations/20250116000004_admin_helper_functions.sql
```

Or using Supabase CLI:

```bash
# Make sure you're in the project directory
cd /Users/alishataylor/siege-clan-tracker

# Apply all migrations
supabase db push
```

### Step 1.2: Verify Database Changes

Check that everything was created correctly:

```sql
-- Check users table structure
\d public.users

-- Should show:
-- - id (uuid)
-- - username (text)
-- - email (text) <- NEW
-- - password_hash (text, nullable) <- NULLABLE NOW
-- - supabase_auth_id (uuid)
-- - is_admin (boolean)
-- - created_at (timestamptz)

-- Check trigger exists
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Should return one row showing the trigger

-- Check functions exist
SELECT proname, prokind
FROM pg_proc
WHERE proname IN ('handle_new_user', 'is_admin', 'get_user_by_email');

-- Should return 3 rows

-- Check RLS policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users';

-- Should show 5 policies
```

## Phase 2: Netlify Function Deployment (15 minutes)

### Step 2.1: Verify Environment Variables

Check your `.env` file (local) and Netlify Dashboard (production):

```bash
# Required variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8888

# For production, also set in Netlify Dashboard:
# Site Settings > Environment Variables
```

### Step 2.2: Test Function Locally

```bash
# Start Netlify Dev
netlify dev

# In another terminal, test the login function
curl -X POST http://localhost:8888/.netlify/functions/auth-login-with-username \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# Should return error (user doesn't exist yet) but no 500 errors
```

### Step 2.3: Deploy to Production

```bash
# Commit the new function
git add netlify/functions/auth-login-with-username.js
git commit -m "Add username login edge function"

# Deploy
netlify deploy --prod

# Or push to GitHub (if auto-deploy enabled)
git push origin main
```

## Phase 3: Frontend Updates (20 minutes)

### Step 3.1: Update AuthContext

Replace the contents of `src/context/AuthContext.jsx` with the new version from `SUPABASE_AUTH_SOLUTION.md`.

Key changes:
- Removed `sha256` password hashing
- Login now calls username login endpoint
- Register passes username in metadata
- Simplified session management

### Step 3.2: Update Admin Helpers

Update `netlify/functions/utils/adminHelpers.js`:

Change line 104 in `validateAuth()` function:

```javascript
// OLD:
.eq('supabase_auth_id', user.id)

// NEW:
.eq('id', user.id)
```

This is because `public.users.id` now matches `auth.users.id` directly.

### Step 3.3: Test Frontend Changes

```bash
# Restart dev server
npm run dev

# Test in browser:
# 1. Try to register a new user
# 2. Check Supabase dashboard that user was created in both tables
# 3. Try to login with the username
# 4. Verify you can access your profile
```

## Phase 4: Testing (30 minutes)

### Test 1: User Registration

```javascript
// In browser console or registration form:
// Register with username: testuser1, password: Test123!

// Check Supabase Dashboard:
// 1. Go to Authentication > Users
//    Should see: testuser1@siege-clan.app

// 2. Go to Table Editor > users
//    Should see:
//    - id: [UUID matching auth.users]
//    - username: testuser1
//    - email: testuser1@siege-clan.app
//    - supabase_auth_id: [same UUID]
//    - is_admin: false
```

### Test 2: User Login

```javascript
// In browser:
// Login with username: testuser1, password: Test123!

// Should:
// 1. Redirect to /profile
// 2. Show user info
// 3. Browser dev tools > Application > Local Storage
//    Should NOT show old localStorage keys
// 4. Check Supabase session is active
```

### Test 3: Admin Promotion

```sql
-- In Supabase SQL Editor:
UPDATE public.users
SET is_admin = true
WHERE username = 'testuser1';

-- Verify:
SELECT id, username, is_admin
FROM public.users
WHERE username = 'testuser1';

-- Should show is_admin = true
```

### Test 4: Admin Functions

```javascript
// 1. Logout and login again as testuser1
// 2. Navigate to /admin
// 3. Try to hide a member
// 4. Check network tab - should see:
//    - Authorization: Bearer [token] header
//    - 200 OK response
// 5. Member should be hidden successfully
```

### Test 5: Non-Admin Cannot Self-Promote

```javascript
// As a non-admin user, try in console:
const { data, error } = await supabase
  .from('users')
  .update({ is_admin: true })
  .eq('id', user.id);

console.log(error);
// Should show permission denied error
```

### Test 6: Session Persistence

```javascript
// 1. Login as a user
// 2. Refresh the page
// 3. Should still be logged in
// 4. Close tab and reopen
// 5. Should still be logged in (until session expires)
```

## Phase 5: Data Migration (If Needed)

### Option A: Existing Users Reset Passwords

If you have existing users, the easiest approach:

1. **Announce Migration**: Tell users they need to re-register
2. **Clear Old Data** (optional): Archive old user records
3. **Users Re-register**: They create accounts with same username
4. **Transfer Claims**: Manually or via script transfer player_claims to new user IDs

### Option B: Programmatic Migration

If you need to preserve existing users:

```javascript
// Example migration script (run server-side with admin API)
// This requires Supabase Admin API access

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function migrateUser(username, temporaryPassword) {
  const email = `${username}@siege-clan.app`;

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      username: username
    }
  });

  if (authError) {
    console.error(`Failed to migrate ${username}:`, authError);
    return;
  }

  // Trigger will create public.users record
  console.log(`Migrated user: ${username}`);

  // TODO: Send password reset email
  const { error: resetError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email
  });

  if (resetError) {
    console.error(`Failed to send reset email to ${username}:`, resetError);
  }
}

// Usage:
// migrateUser('existinguser1', 'TempPass123!');
```

### Option C: Gradual Migration

Let users migrate themselves on first login:

1. Keep old login code temporarily
2. On successful old-style login, create Supabase auth account
3. Migrate user data
4. Log them in with new system
5. Remove old login code after X days

## Phase 6: Admin Setup

### Make Yourself Admin

```sql
-- In Supabase SQL Editor:
UPDATE public.users
SET is_admin = true
WHERE username = 'your_username';

-- Verify:
SELECT username, is_admin
FROM public.users
WHERE is_admin = true;
```

### Grant Admin to Another User

```sql
-- Option 1: Direct SQL
UPDATE public.users
SET is_admin = true
WHERE username = 'other_username';

-- Option 2: Using Admin Panel
-- After you're admin, you can use the admin panel
-- to toggle admin status for other users
```

### Revoke Admin

```sql
UPDATE public.users
SET is_admin = false
WHERE username = 'username_to_demote';
```

## Troubleshooting

### Issue: "User not found" after registration

**Symptoms**: User created in auth.users but not in public.users

**Diagnosis**:
```sql
-- Check if trigger is working
SELECT * FROM auth.users WHERE email LIKE '%@siege-clan.app';
SELECT * FROM public.users;
-- If auth.users has more users than public.users, trigger failed
```

**Solution**:
```sql
-- Manually trigger for existing auth users
SELECT public.handle_new_user()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = u.id
);
```

### Issue: Login returns 401 even with correct password

**Diagnosis**:
```bash
# Check Netlify function logs
netlify functions:log auth-login-with-username

# Check for errors like:
# - Username lookup failed
# - Auth error
# - Missing session data
```

**Solutions**:
1. Verify user exists: `SELECT * FROM users WHERE username = 'testuser'`
2. Check email matches: `SELECT email FROM users WHERE username = 'testuser'`
3. Try logging in with email directly in Supabase dashboard
4. Verify SUPABASE_ANON_KEY is set correctly

### Issue: Admin functions return 403 Forbidden

**Diagnosis**:
```sql
-- Check user's admin status
SELECT id, username, is_admin, supabase_auth_id
FROM public.users
WHERE username = 'your_username';

-- Verify IDs match
-- id should equal supabase_auth_id
```

**Solutions**:
1. Ensure `is_admin = true` in database
2. Verify `id = supabase_auth_id` (should match)
3. Check JWT token is being sent in Authorization header
4. Verify edge function has SUPABASE_SERVICE_ROLE_KEY

### Issue: "Cannot update is_admin column"

**This is expected!** Users cannot promote themselves.

Only two ways to change admin status:
1. Direct SQL in Supabase dashboard (as database owner)
2. Via admin edge function (using service role key)

### Issue: Trigger not firing on new signups

**Diagnosis**:
```sql
-- Check trigger exists
SELECT * FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check function exists
SELECT * FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check function permissions
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'handle_new_user';
```

**Solution**:
Re-run migration 20250116000002_auto_create_users.sql

## Rollback Plan

If you need to rollback to the old system:

### Step 1: Disable New Auth
```bash
# Revert AuthContext changes
git checkout HEAD~1 src/context/AuthContext.jsx

# Or restore from backup
cp src/context/AuthContext.jsx.backup src/context/AuthContext.jsx
```

### Step 2: Keep Database Changes
The new columns and triggers are backwards compatible:
- `email` column can coexist with old system
- `password_hash` is still nullable
- Old login code can still work

### Step 3: Remove Edge Function
```bash
# Delete the function
rm netlify/functions/auth-login-with-username.js

# Redeploy
netlify deploy --prod
```

## Performance Notes

### Database Indexes

The migrations create these indexes for performance:
- `idx_users_supabase_auth_id` - Fast admin validation
- `idx_users_email` - Fast email lookup during login

### Function Optimization

The `is_admin()` function is marked `STABLE` which allows Postgres to cache the result within a query. This improves performance in RLS policies.

### Login Flow Performance

```
Username Login:
1. Client -> Edge Function (1 request)
2. Edge Function -> Supabase (2 queries: lookup + auth)
3. Edge Function -> Client (session data)
Total: ~200-400ms
```

## Security Checklist

- [ ] Service role key never exposed to client
- [ ] CORS properly configured in edge functions
- [ ] RLS enabled on users table
- [ ] Column-level security prevents is_admin self-promotion
- [ ] JWT tokens validated on all admin operations
- [ ] Passwords stored securely (by Supabase Auth)
- [ ] Email addresses not enumerable (generic error messages)
- [ ] Session tokens use secure httpOnly cookies (by Supabase)

## Next Steps

After successful implementation:

1. **Remove Legacy Code**: Clean up old password hashing code
2. **Drop Password Hash Column**: After all users migrated
3. **Add Email Verification**: If you want to verify emails
4. **Add Password Reset**: Implement forgot password flow
5. **Add OAuth**: Consider adding Google/GitHub login
6. **Audit Logging**: Log admin actions for compliance
7. **Rate Limiting**: Add rate limiting to login endpoint

## Support

If you run into issues:

1. Check Supabase logs: Dashboard > Logs
2. Check Netlify function logs: `netlify functions:log`
3. Check browser console for errors
4. Review RLS policies: Ensure they match the migration
5. Verify environment variables are set correctly

## References

- [SUPABASE_AUTH_SOLUTION.md](./SUPABASE_AUTH_SOLUTION.md) - Complete technical solution
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
