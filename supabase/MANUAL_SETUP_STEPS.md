# Manual Setup Steps for Supabase

Since the automated script needs interactive terminal access, follow these steps manually.

## ✅ Step 1: Login to Supabase

Open your **regular terminal** (not in VS Code) and run:

```bash
supabase login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Save your credentials

## ✅ Step 2: Get Your Project Reference ID

You need your project reference ID. Find it here:
- **URL method**: Look at your dashboard URL: `https://app.supabase.com/project/YOUR-PROJECT-REF`
- **Dashboard method**: Settings > General > Reference ID

Copy it - you'll need it next!

## ✅ Step 3: Link Your Project

In your terminal, navigate to your project directory:

```bash
cd /Users/alishataylor/siege-clan-tracker
```

Then link your project (replace YOUR-PROJECT-REF):

```bash
supabase link --project-ref YOUR-PROJECT-REF
```

It will ask for your **database password** - use the one you just reset!

## ✅ Step 4: Apply Migrations

Run this command to apply all migrations:

```bash
supabase db push
```

This will:
- Create the 4 admin RPC functions
- Set up all RLS policies
- Enable RLS on all tables

You should see output like:
```
Applying migration 20250104000001_create_admin_rpc_functions.sql...
Applying migration 20250104000002_setup_rls_policies.sql...
Finished supabase db push.
```

## ✅ Step 5: Verify Setup

Run the verification script:

```bash
./supabase/verify-setup.sh
```

This will check:
- ✅ All 4 RPC functions created
- ✅ RLS enabled on all tables
- ✅ Policies in place
- ✅ Tables accessible

## ✅ Step 6: Get Your API Keys

You'll need these for Netlify environment variables:

1. Go to Supabase Dashboard
2. Settings > API
3. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Secret!

## What If Something Goes Wrong?

### "Project not linked" error:
- Make sure you're in the right directory: `/Users/alishataylor/siege-clan-tracker`
- Check that `supabase/.temp/project-ref` file was created

### "Password authentication failed":
- Make sure you're using the DATABASE password (the one you just reset)
- NOT your Supabase account password

### "Migration failed":
- Read the error message carefully
- The SQL files are at: `supabase/migrations/`
- You can run them manually in Dashboard > SQL Editor

### Still stuck?
- Go to Supabase Dashboard
- SQL Editor (left sidebar)
- Create a new query
- Copy/paste contents of `supabase/migrations/20250104000001_create_admin_rpc_functions.sql`
- Click Run
- Repeat for the second migration file

## After Successful Setup

1. ✅ Update Netlify environment variables (see Step 6)
2. ✅ Test PR #36 on preview deployment
3. ✅ Verify admin operations work

---

**Need help?** Let me know where you got stuck!
