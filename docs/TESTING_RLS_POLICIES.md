# Testing RLS (Row Level Security) Policies

This guide explains how to test Supabase RLS policies to catch permission issues before they reach production.

## The Problem

RLS policy issues are hard to catch because:
- Unit tests use mocked Supabase clients (don't test actual policies)
- Manual testing is time-consuming and error-prone
- Errors only appear when users try to perform actions
- Different user roles have different permissions

## Recent Issue Example

**Issue**: Non-admin users couldn't create claim requests
**Symptoms**:
- `GET /api/claim-requests` returned 401 Unauthorized
- Direct insert failed with "new row violates row-level security policy"

**Root Cause**: Missing INSERT policy on `claim_requests` table

## How to Prevent This

### 1. Integration Tests (Recommended)

Located in: `src/__tests__/claimRequests.integration.test.jsx`

These tests run against real Supabase to verify RLS policies work correctly.

**Setup Required**:
```bash
# Set up environment variables
cp .env.example .env.test
# Add your test Supabase credentials

# Run integration tests
npm run test:integration
```

**What Integration Tests Check**:
- ✅ Users can read data they should have access to
- ✅ Users can insert/update/delete as allowed by policies
- ✅ RLS blocks unauthorized operations
- ✅ Different user roles get appropriate access

### 2. Manual Testing Checklist

When adding new tables or modifying RLS policies:

#### As Anonymous User (Not Logged In):
- [ ] Can read public data (members, events, races)
- [ ] Cannot read private data (users table)
- [ ] Cannot insert/update/delete anything

#### As Authenticated User (Regular User):
- [ ] Can read own profile in users table
- [ ] Can create claim requests
- [ ] Can read all claim requests
- [ ] Cannot update/delete other users' data
- [ ] Cannot modify members table

#### As Admin User:
- [ ] Can read all data
- [ ] Can update members, events, races
- [ ] Can process claim requests
- [ ] Can manage users

### 3. Policy Review Checklist

Before deploying RLS policy changes:

```sql
-- For each table, verify:
-- 1. RLS is enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 2. Service role has full access (for edge functions)
CREATE POLICY "service_role_all" ON table_name
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Read policies exist for public/authenticated users
CREATE POLICY "public_read" ON table_name
  FOR SELECT TO public, anon, authenticated
  USING (/* conditions */);

-- 4. Write policies match business requirements
CREATE POLICY "authenticated_insert" ON table_name
  FOR INSERT TO authenticated
  WITH CHECK (/* conditions */);
```

### 4. Common RLS Patterns

#### Public Read, Authenticated Write
```sql
-- Anyone can read
CREATE POLICY "public_read_table"
  ON table_name FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- Only authenticated can write
CREATE POLICY "authenticated_write_table"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

#### User-Scoped Data
```sql
-- Users can only see their own data
CREATE POLICY "users_own_data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

#### Admin-Only Operations
```sql
-- Only admins can update
CREATE POLICY "admin_only_update"
  ON table_name FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );
```

## Testing Workflow

### Before Making RLS Changes:
1. Document current behavior
2. Write integration test for expected new behavior
3. Run test - should fail
4. Make RLS policy changes
5. Apply migration with `supabase db push`
6. Run test - should pass

### After Making RLS Changes:
1. Run full integration test suite
2. Test manually with different user roles
3. Check Supabase logs for policy violations
4. Deploy to staging
5. Smoke test critical flows

## Monitoring RLS in Production

### Supabase Dashboard:
- Go to Authentication → Policies
- Review all policies for each table
- Check for missing policies

### Check Logs:
```sql
-- Find RLS violations in Supabase logs
SELECT * FROM logs
WHERE message LIKE '%row-level security%'
ORDER BY created_at DESC;
```

### Alert on Common Errors:
- `new row violates row-level security policy`
- `insufficient privileges`
- `permission denied for table`

## Troubleshooting

### "Permission Denied" Error
1. Check if RLS is enabled: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
2. List all policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
3. Verify user role: authenticated vs anon
4. Check policy conditions match your data

### Edge Functions Not Working
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify edge function uses service role client
- Check service_role policy exists on all tables

### Tests Failing
- Verify test environment variables
- Check if policies are applied to test database
- Ensure test user has correct permissions

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)
- [Testing Auth in Supabase](https://supabase.com/docs/guides/auth/testing)
