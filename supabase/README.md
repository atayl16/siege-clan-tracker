# Supabase Database Configuration

This directory contains database migrations and setup scripts for the Siege Clan Tracker Supabase database.

## Files

- **migrations/** - SQL migration files (version controlled)
  - `20250104000003_rls_policies_simplified.sql` - Sets up Row Level Security policies

- **SETUP_GUIDE.md** - Comprehensive setup instructions with troubleshooting
- **QUICK_SETUP.sh** - Automated setup script for quick deployment
- **README.md** - This file

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./supabase/QUICK_SETUP.sh
```

This will:
1. Check if Supabase CLI is installed
2. Log you in (if needed)
3. Link your project (if needed)
4. Apply all migrations
5. Verify the setup

### Option 2: Manual Setup

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   ```

4. **Apply migrations**:
   ```bash
   supabase db push --include-all
   ```

### Option 3: Dashboard (If CLI has issues)

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste contents of each migration file
3. Run them in order

## What Gets Created

### RLS Policies

Security policies for 8 tables:
- **members** - Public can read visible members only
- **users** - Authenticated users can read all, anon can read own
- **events** - Public can read all
- **player_claims** - Public can read all, users manage own
- **claim_requests** - Public can read all
- **user_goals** - Users manage own, public can read public goals
- **races** - Public can read all
- **race_participants** - Public can read all

## Verification

After setup, verify RLS is enabled:

```bash
# Check RLS enabled
supabase db execute --query "
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('members', 'users');
"
```

Note: Admin RPC functions will be added by PR #36.

## Troubleshooting

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed troubleshooting steps.

Common issues:
- **"Project not linked"** - Run `supabase link --project-ref YOUR-REF`
- **"Password authentication failed"** - Use database password, not account password
- **Functions not created** - Check migration output for errors

## Next Steps

After successful setup:

1. ✅ Verify RLS is enabled on all tables
2. ✅ Update Netlify environment variables (for staging):
   - `SUPABASE_URL` (staging URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (staging key)
   - `SUPABASE_ANON_KEY` (staging key)
3. ✅ Merge PR #36 (which will add admin RPC functions)
4. ✅ Test edge functions with staging database
5. ✅ Apply migrations to production after testing

## Backup

To backup your database schema:

```bash
supabase db dump --file supabase/backup-$(date +%Y%m%d).sql
```

## Creating New Migrations

When making future database changes:

```bash
supabase migration new your_change_description
```

Edit the generated file, then apply:

```bash
supabase db push
```

This keeps your database schema version controlled!
