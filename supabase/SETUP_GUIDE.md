# Supabase Setup Guide

This guide will help you set up all necessary Supabase configurations from the command line.

## Prerequisites

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```
   This will open your browser for authentication.

## Step 1: Link Your Project

First, you need to link this local repository to your Supabase project:

```bash
# Find your project reference ID from your Supabase dashboard URL
# URL format: https://app.supabase.com/project/[YOUR-PROJECT-REF]
# Or find it in Settings > General > Reference ID

supabase link --project-ref YOUR-PROJECT-REF
```

The CLI will ask for your database password - use your Supabase database password (not your account password).

## Step 2: Apply Migrations

Apply both migration files in order:

```bash
# Apply RPC functions migration
supabase db push --include-all

# Or apply specific files if you prefer:
# supabase db execute --file supabase/migrations/20250104000001_create_admin_rpc_functions.sql
# supabase db execute --file supabase/migrations/20250104000002_setup_rls_policies.sql
```

## Step 3: Verify the Setup

### Check that RPC functions were created:

```bash
supabase db execute --query "
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%'
ORDER BY routine_name;
"
```

**Expected output:** Should list 4 functions:
- admin_delete_member
- admin_toggle_member_visibility
- admin_toggle_user_admin
- admin_update_member

### Check that RLS is enabled:

```bash
supabase db execute --query "
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('members', 'users', 'events', 'player_claims', 'claim_requests', 'user_goals', 'races', 'race_participants')
ORDER BY tablename;
"
```

**Expected output:** All tables should have `rowsecurity = true`

### Check RLS policies:

```bash
supabase db execute --query "
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"
```

**Expected output:** Should list multiple policies for each table (members, users, etc.)

## Step 4: Test the RPC Functions

### Test admin_toggle_member_visibility:

```bash
supabase db execute --query "
SELECT admin_toggle_member_visibility(
  p_wom_id := 123456,  -- Replace with a real wom_id from your members table
  p_hidden := true
);
"
```

**Expected output:** JSON response with the updated member data

### Test retrieving members (respecting RLS):

```bash
supabase db execute --query "
SELECT count(*)
FROM members
WHERE hidden = false OR hidden IS NULL;
"
```

This should return the count of visible members only.

## Troubleshooting

### Error: "Project not linked"
- Make sure you ran `supabase link` with the correct project reference ID
- Check that `supabase/.temp/project-ref` file exists

### Error: "Password authentication failed"
- Use your **database password**, not your Supabase account password
- Reset it in Supabase Dashboard > Settings > Database > Database Password

### Error: "Permission denied"
- Make sure you're logged in: `supabase login`
- Verify your account has access to the project

### Functions not appearing
- Check that the migration ran successfully
- Look for error messages in the migration output
- Run the verify query to check function existence

## Alternative: Apply Manually via Supabase Dashboard

If CLI gives you trouble, you can apply the migrations manually:

1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the contents of each migration file
5. Click "Run" for each one

This achieves the same result as the CLI approach.

## Next Steps

After successful setup:

1. Update your Netlify environment variables with:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (from Settings > API > service_role key)
   - `SUPABASE_ANON_KEY` (from Settings > API > anon public key)

2. Test the edge functions in PR #36 on a Netlify preview deployment

3. Verify admin operations work correctly:
   - Edit a member
   - Hide/show a member
   - Delete a member (test on non-production data!)
   - Promote/demote an admin

## Backup & Recovery

To export your current schema (for backup):

```bash
supabase db dump --file supabase/backup-$(date +%Y%m%d).sql
```

To export just the schema (no data):

```bash
supabase db dump --schema-only --file supabase/schema-backup.sql
```

## Keeping Migrations in Sync

When you make future changes:

1. Create a new migration file with a timestamp:
   ```bash
   supabase migration new your_migration_name
   ```

2. Edit the generated file in `supabase/migrations/`

3. Apply it:
   ```bash
   supabase db push
   ```

This keeps your database changes version controlled and reproducible!
