# Supabase Configuration Fix Steps

## Problem
Users cannot register or login due to email confirmation requirements.

## Fix Steps

### Step 1: Disable Email Confirmation

1. Go to: https://app.supabase.com/project/rbcssjjhbsgfmilpazux
2. Click **Authentication** in left sidebar
3. Click **Providers**
4. Click on **Email** provider
5. Scroll down to **"Confirm email"** toggle
6. **DISABLE** the toggle (turn it OFF)
7. Click **Save**

### Step 2: Confirm Existing Users

For any users that already registered (like "roinrin"):

1. Go to **Authentication** → **Users**
2. Find the user (email: `roinrin@siege-clan.com`)
3. Click the user to open details
4. Look for **"Email Confirmed"** field
5. If it's not checked, click the **"..."** menu → **"Confirm Email"**

### Step 3: Verify Database Trigger

Check if the trigger is creating user records:

1. Go to **SQL Editor** tab
2. Run this query:

```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';
```

Expected result:
- `trigger_name`: `on_auth_user_created`
- `event_manipulation`: `INSERT`

If trigger is missing, run:

```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';

-- If function exists but trigger doesn't, create it:
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Check Existing User Record

For the registered user, verify the users table record exists:

```sql
-- Check auth.users
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'roinrin@siege-clan.com';

-- Check public.users
SELECT id, username, email, is_admin
FROM public.users
WHERE email = 'roinrin@siege-clan.com';
```

If the public.users record is missing but auth.users exists, manually create it:

```sql
INSERT INTO public.users (id, username, email, supabase_auth_id, is_admin)
SELECT id, split_part(email, '@', 1), email, id, false
FROM auth.users
WHERE email = 'roinrin@siege-clan.com'
ON CONFLICT (id) DO NOTHING;
```

### Step 5: Test Registration

1. Delete the test user if needed
2. Try registering with a new simple username (e.g., "testuser123")
3. Should succeed without errors
4. Try logging in immediately
5. Should work without email confirmation

## Common Issues

### "Email not confirmed" error
- Email confirmation is still enabled → Repeat Step 1
- Existing user needs manual confirmation → Repeat Step 2

### "Account created but setup incomplete"
- Trigger isn't creating user records → Check Step 3
- RLS policies blocking inserts → Check RLS policies in Table Editor

### 406 errors in console
- Supabase client configuration issue
- Try refreshing the page and clearing browser cache
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly

## Verification

After completing all steps, you should be able to:
1. Register a new user with a simple username
2. Login immediately without email confirmation
3. See the user in both auth.users and public.users tables
4. Access the application as a regular user
