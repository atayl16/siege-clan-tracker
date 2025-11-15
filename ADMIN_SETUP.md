# Admin Account Setup Guide

## Problem Overview

The admin authentication system requires a valid Supabase JWT token to perform admin operations through edge functions. This document explains how to properly set up the admin account.

## Root Cause

The hardcoded admin login was creating localStorage flags but **not establishing a Supabase auth session**. Edge functions validate admin requests by:

1. Checking for a valid JWT token in the Authorization header
2. Looking up a user with `supabase_auth_id` matching the token
3. Verifying that user has `is_admin = true`

Without a Supabase session, admin operations fail with: `"Missing Supabase session token for admin request"`

## Solution

### 1. Configure Environment Variables

Add these to your `.env` file:

```bash
# Admin Account Configuration (REQUIRED for admin auth)
VITE_ADMIN_SUPABASE_EMAIL=admin@siegeclan.org
VITE_ADMIN_SUPABASE_PASSWORD=your-secure-password-here
```

**Important Notes:**
- These credentials are for Supabase authentication (JWT token generation)
- They are **different** from the hardcoded admin login credentials
- Use a strong, unique password
- Never commit the `.env` file to version control

### 2. First-Time Setup

When you log in as admin for the first time with the new code:

1. The system will attempt to sign in to Supabase with the credentials from `.env`
2. If the account doesn't exist, it will automatically create it
3. It will create or update the admin user record in the database with the correct `supabase_auth_id`

### 3. Verification

After logging in as admin, check the browser console for these messages:

```
✅ Admin authenticated with Supabase successfully
✅ Admin user updated with supabase_auth_id: [UUID]
```

If you see errors:
- Check that `VITE_ADMIN_SUPABASE_PASSWORD` is set in `.env`
- Restart your dev server after adding environment variables
- Check Supabase auth settings allow sign-ups

### 4. Testing Admin Functions

After successful setup, admin functions should work:
- Hide/unhide members
- Approve claim requests
- Update member data
- Change user admin status

## Troubleshooting

### "Admin authentication not properly configured"
- `VITE_ADMIN_SUPABASE_PASSWORD` is missing from `.env`
- Solution: Add the variable and restart the dev server

### "Missing Supabase session token for admin request"
- Supabase auth session wasn't created
- Solution: Log out and log back in as admin
- Check browser console for error messages during login

### "Unauthorized: Invalid token"
- Session has expired
- Solution: Log out and log back in

### "Forbidden: Admin access required"
- User record doesn't have `is_admin = true` or `supabase_auth_id` is incorrect
- Solution: Check the database `users` table for the admin record

## Database Schema Requirements

The `users` table must have:
- `supabase_auth_id` column (UUID, nullable)
- `is_admin` column (BOOLEAN)

## Security Considerations

1. **Never** commit `.env` files
2. Use strong passwords for Supabase admin auth
3. Rotate passwords periodically
4. Monitor admin access logs in Supabase dashboard
5. Consider adding 2FA for production environments

## Manual Database Setup (Optional)

If automatic setup fails, you can manually create the admin user in Supabase:

1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user with email `admin@siegeclan.org` (or your configured email)
3. Note the User UID
4. Go to Table Editor → users table
5. Find or create the admin user record
6. Set `supabase_auth_id` to the User UID from step 3
7. Set `is_admin` to `true`

## Changes Made

### `.env.example`
Added environment variables for admin Supabase credentials

### `src/context/AuthContext.jsx`
- Added `ensureAdminUserRecord()` helper function
- Fixed admin login to create Supabase session with proper credentials
- Updated logout to sign out from Supabase
- Improved error handling and logging

### Key Fixes
1. **Use actual password** instead of hash for Supabase auth
2. **Create/update user record** with correct `supabase_auth_id`
3. **Proper error handling** with user-friendly messages
4. **Session management** for persistent admin access
