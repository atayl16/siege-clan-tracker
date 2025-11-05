# Migration Rollback Guide

## Quick Rollback (Using the Script)

If you need to rollback the RLS policies migration:

```bash
./scripts/rollback-rls-migration.sh
```

The script will:
1. Validate required tools are installed (supabase CLI, psql)
2. Ask which database (staging or production)
3. Confirm the rollback (especially for production)
4. Drop all RLS policies
5. Disable RLS on all tables
6. Mark the migration as reverted

## Manual Rollback

If you prefer to rollback manually:

### Step 1: Run the Rollback SQL

```bash
# Link to the database you want to rollback
supabase link --project-ref YOUR-PROJECT-REF

# Run the rollback SQL
psql "$(supabase db url --linked)" -f supabase/migrations/ROLLBACK_20250104000003_rls_policies.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/ROLLBACK_20250104000003_rls_policies.sql`
3. Run the SQL

### Step 2: Mark Migration as Reverted

```bash
supabase migration repair 20250104000003 --status reverted --linked
```

This updates Supabase's migration history so it knows the migration was reverted.

### Step 3: Verify

```bash
supabase migration list --linked
```

You should see `20250104000003` no longer listed as applied.

## What Gets Rolled Back

The rollback removes:
- All RLS policies on members, users, events, claim_requests, races, race_participants
- RLS enforcement on those tables

**Security Note:** After rollback, your tables will have NO security policies. Anyone with the anon key can read/write all data. Only rollback if you have a good reason!

## Re-applying After Rollback

If you rollback and want to re-apply:

```bash
supabase db push
```

This will re-run the migration.

## Emergency Production Rollback

If something breaks in production:

1. **Immediate fix:** Rollback using the script
   ```bash
   ./scripts/rollback-rls-migration.sh
   # Choose option 2 (Production)
   ```

2. **Verify production is working again**

3. **Fix the issue locally/staging**

4. **Re-apply when ready:**
   ```bash
   supabase link --project-ref xshjeogimlzltdjpeejp
   supabase db push
   ```

## What Can't Be Rolled Back

Some things cannot be easily rolled back:
- Data changes (if migration modified data)
- Schema changes that other code depends on
- Changes that users already interacted with

**The RLS migration IS safe to rollback** because it only adds/removes policies, doesn't change data or schema.

## Testing Rollback

It's a good idea to test the rollback on staging:

```bash
# Rollback on staging
./scripts/rollback-rls-migration.sh
# Choose option 1 (Staging)

# Test that your app still works

# Re-apply
supabase link --project-ref rbcssjjhbsgfmilpazux
supabase db push

# Test again
```

This gives you confidence the rollback works if you ever need it.
