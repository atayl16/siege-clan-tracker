# Admin User Setup Guide

## Overview

This application uses **Supabase Auth** for all authentication. Admin privileges are controlled by a simple `is_admin` flag in the database.

## ⚠️ IMPORTANT: Required Supabase Configuration

**You MUST disable email confirmation in Supabase** before users can register:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers** → **Email**
4. **Disable** "Confirm email" toggle
5. Click **Save**

**Why?** This app uses fake emails (`username@siege-clan.com`), so users cannot receive or confirm emails. Without disabling confirmation, all registrations will fail at login with "Email not confirmed" error.

## How It Works

1. **User Registration**: Users register with username and password
   - Supabase Auth creates an auth user with email `username@siege-clan.com`
   - Database trigger automatically creates a `users` table record
   - User starts with `is_admin = false`

2. **Making Someone Admin**: Simply update the database
   ```sql
   UPDATE users SET is_admin = true WHERE username = 'username_here';
   ```

3. **Admin Login**: Admins log in the same way as regular users
   - Enter their username and password
   - System automatically recognizes admin status from database
   - Admin operations work via JWT token validation

## Creating an Admin Account

### Option 1: Promote Existing User

1. User registers through the normal registration flow
2. In Supabase Dashboard → Table Editor → users table
3. Find the user and set `is_admin` to `true`
4. Done! User can now perform admin operations

### Option 2: Create Admin via SQL

```sql
-- First, create the auth user via Supabase Dashboard:
-- Go to Authentication → Users → Add User
-- Email: yourusername@siege-clan.com
-- Password: [choose secure password]
-- Auto Confirm: ✓

-- Then update the users table record:
UPDATE users
SET is_admin = true
WHERE email = 'yourusername@siege-clan.com';
```

## Verifying Admin Access

After setting up an admin user:

1. Log in with the username (without @siege-clan.com)
2. Open browser console
3. Check for: `"Using admin client with RLS"`
4. Admin tabs should be visible in the UI
5. Test hiding/unhiding a member to verify JWT tokens work

## Troubleshooting

### "Invalid username or password"
- Check the user exists in Authentication → Users
- Verify the password is correct
- Try resetting password in Supabase Dashboard

### "Account setup incomplete"
- The users table record might be missing
- Check if user exists in users table with matching `id` from auth.users
- The trigger should create this automatically - if missing, check trigger is active

### Admin operations fail with 403
- Verify `is_admin = true` in users table
- Check that `supabase_auth_id` matches the auth user's ID
- Verify user is logged in (check browser console for session)

### "Using regular client" instead of admin client
- User is not marked as admin in database
- Run: `SELECT is_admin FROM users WHERE username = 'your_username';`
- Should return `true` for admin users

## Database Structure

The system requires these fields in the `users` table:
- `id` - UUID (matches auth.users.id)
- `username` - Text (unique)
- `email` - Text (matches auth.users.email)
- `is_admin` - Boolean (controls admin access)
- `supabase_auth_id` - UUID (matches id, set by trigger)

## Security Notes

1. **No hardcoded admins**: All admin accounts are in the database
2. **JWT-based auth**: All admin operations require valid Supabase session
3. **Column-level security**: Users cannot promote themselves to admin
4. **Service role only**: Only edge functions can modify `is_admin` field

## Migration from Old System

If you had a hardcoded admin or password_hash-based system:

1. All existing users need to reset their passwords
2. Or create new accounts via the registration flow
3. The `password_hash` column is now deprecated and unused
4. Supabase Auth is the single source of truth for passwords

---

**Last Updated**: 2025-01-16
**Auth System**: Supabase Auth with Database Trigger
