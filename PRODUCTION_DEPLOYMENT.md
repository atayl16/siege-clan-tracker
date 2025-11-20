# Production Deployment Checklist

## ⚠️ CRITICAL: Read This Before Deploying to Production

This branch includes significant authentication changes. Follow this checklist carefully to ensure production stays stable.

---

## Pre-Deployment: Schema Verification

### Step 1: Compare Database Schemas

**Run this in BOTH staging and production SQL editors:**

```sql
-- Check users table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid, NOT NULL)
- `username` (text, NOT NULL)
- `password_hash` (text, NOT NULL) - deprecated but required
- `is_admin` (boolean, NOT NULL)
- `created_at` (timestamp with time zone, NOT NULL)
- `supabase_auth_id` (uuid, NULL)

**Action:** If production schema is different, document differences and adjust migration accordingly.

---

## Pre-Deployment: Supabase Configuration

### Step 2: Verify Auth Settings in Production

Go to Production Supabase Dashboard:
1. **Authentication → Providers → Email**
2. **Disable "Confirm email"** toggle
3. Save changes

**Why:** This app uses fake emails (`username@siege-clan.com`), so users cannot confirm emails.

**Verification:**
- Try registering a test user in staging
- Should succeed without email confirmation
- If it fails, email confirmation is still enabled

---

## Pre-Deployment: Test Staging Thoroughly

### Step 3: Complete Staging Test

Before touching production, verify staging works:

**Test Registration:**
```
1. Go to /register
2. Register with username: prod_test_user
3. Should complete without hanging
4. Check console for errors
5. Verify user appears in auth.users AND public.users
```

**Test Login:**
```
1. Go to /login
2. Login with prod_test_user
3. Should redirect to /profile
4. No console errors
5. User state is set correctly
```

**Test Trigger:**
```sql
-- Verify trigger exists in staging
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';

-- Expected: on_auth_user_created, INSERT
```

**Test User Records:**
```sql
-- All auth users should have public.users records
SELECT
    'Auth users' as source,
    COUNT(*) as count
FROM auth.users
WHERE email LIKE '%@siege-clan.com'
UNION ALL
SELECT
    'Public users' as source,
    COUNT(*) as count
FROM public.users;

-- Counts should MATCH
```

✅ **Only proceed if all staging tests pass**

---

## Deployment: Database Migrations

### Step 4: Backup Production Database

**Before running ANY migrations:**

```bash
# Using Supabase CLI
supabase db dump --linked --file backup-pre-auth-$(date +%Y%m%d).sql

# Or via Supabase Dashboard
# Projects → [Your Project] → Database → Backups → Create Backup
```

**Verify backup was created and is accessible.**

### Step 5: Run Migrations in Production

**Option A: Using Supabase CLI (Recommended)**

```bash
# Link to production project
supabase link --project-ref your-production-project-ref

# Dry run to see what will be applied
supabase db push --dry-run

# Review the migrations carefully
# If everything looks good, apply them
supabase db push
```

**Option B: Manual SQL Execution**

If migrations are already applied, run the fix script:

1. Copy contents of `fix-trigger-and-users.sql`
2. Go to Production Supabase → SQL Editor
3. Run the script
4. Verify output shows:
   - Function created or already exists
   - Trigger created or already exists
   - Auth users count = Public users count

### Step 6: Verify Production Trigger

```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';

-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';
```

---

## Deployment: Application Code

### Step 7: Deploy Code Changes

**If using CI/CD:**
1. Merge PR to main
2. Wait for deploy to complete
3. Monitor deploy logs

**If deploying manually:**
1. Build: `npm run build`
2. Deploy dist/ to hosting
3. Clear CDN cache if applicable

### Step 8: Update Environment Variables

**Verify these are set in Production Netlify:**

```
VITE_SUPABASE_URL=<your-production-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_URL=<your-production-supabase-url>
SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>
```

**DO NOT use staging credentials in production!**

---

## Post-Deployment: Verification

### Step 9: Test Production Immediately

**Critical Path Tests:**

1. **Registration Test**
   - Create test user: `prod_deploy_test_$(date +%s)`
   - Should complete without errors
   - Check auth.users and public.users tables

2. **Login Test**
   - Login with test user
   - Should redirect to /profile
   - Check console for errors

3. **Admin Test (if applicable)**
   - Make test user admin: `UPDATE users SET is_admin = true WHERE username = 'prod_deploy_test_...'`
   - Login again
   - Should redirect to /admin
   - Admin functions should work

### Step 10: Monitor Production

**First Hour:**
- Watch error logs (Sentry, Netlify Functions, browser console)
- Monitor user signups
- Check Supabase logs for auth errors

**First Day:**
- Verify no increase in error rates
- Check that new users can register and login
- Monitor support channels for issues

---

## Rollback Plan

### If Things Go Wrong

**Immediate Actions:**

1. **Revert Application Code**
   ```bash
   # If using Git + CI/CD
   git revert <commit-hash>
   git push origin main
   ```

2. **Restore Database (if needed)**
   ```bash
   # Restore from backup
   supabase db restore backup-pre-auth-YYYYMMDD.sql
   ```

3. **Disable New Registrations**
   - Temporarily disable /register route
   - Show maintenance message

**Communication:**
- Post status update
- Notify users of issue
- Provide ETA for fix

---

## Common Production Issues

### Issue: "Email not confirmed" errors

**Cause:** Email confirmation is still enabled in production
**Fix:** Disable it in Supabase Dashboard → Authentication → Providers → Email

### Issue: "Account created but setup incomplete"

**Cause:** Trigger not firing or users table records not being created
**Fix:** Run `fix-trigger-and-users.sql` in production

### Issue: Login succeeds but page doesn't redirect

**Cause:** User record doesn't exist in public.users
**Fix:** Backfill missing users:
```sql
-- Use the Step 4 from fix-trigger-and-users.sql
INSERT INTO public.users (id, username, password_hash, supabase_auth_id, is_admin, created_at)
SELECT ...
```

### Issue: 406 errors on Supabase queries

**Cause:** RLS policies or PostgREST configuration issue
**Fix:** Check RLS policies are applied correctly, verify anon role has SELECT access

---

## Schema Migration Differences

### If Production Has Different Schema

**Scenario:** Production has extra columns or different constraints

**Action:**
1. Document the differences
2. Create custom migration for production
3. Test in staging with production schema
4. Apply to production
5. Update staging to match

**Example:**
```sql
-- If production has 'email' column but staging doesn't
-- Add column to staging first
ALTER TABLE public.users ADD COLUMN email TEXT;

-- Then update trigger to populate it
-- Then test everything
-- Then apply to production
```

---

## Success Criteria

✅ All tests pass in staging
✅ Production backup created
✅ Migrations applied successfully
✅ Trigger exists and works
✅ Email confirmation disabled
✅ Test user can register
✅ Test user can login
✅ No console errors
✅ Auth users count = Public users count
✅ No spike in error logs

---

## Timeline

**Recommended deployment window:** Off-peak hours (late evening/early morning)

**Estimated time:**
- Pre-deployment checks: 30 minutes
- Database backup: 5 minutes
- Migration execution: 5 minutes
- Code deployment: 10 minutes
- Post-deployment testing: 30 minutes
- **Total: ~1.5 hours**

**Plan for 2-3 hours** to account for unexpected issues.

---

## Contact

If issues arise during deployment:
- Check this document first
- Review error logs (Sentry, Netlify, Supabase)
- Rollback if necessary
- Debug in staging, not production

---

**Last Updated:** 2025-11-20
**Branch:** claude/feat-navbar-user-navigation
**Prepared By:** Claude Code
