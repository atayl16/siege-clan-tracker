# Admin Edge Functions Documentation

This document describes the admin edge functions used in the Siege Clan Tracker application and their configuration requirements.

## Overview

Admin operations are secured by moving sensitive database operations from the client-side to Netlify Edge Functions. These functions use the Supabase service role key, which has elevated permissions and bypasses Row Level Security (RLS) policies.

## Why Edge Functions?

Previously, the application attempted to use admin operations directly from the client using the anon key. This approach had several problems:

1. **Security Risk**: The service role key should never be exposed to the client
2. **RLS Bypass**: Admin operations need to bypass RLS policies, which the anon key cannot do
3. **Failed Operations**: Admin operations were silently failing because the anon key lacked permissions

The solution is to use Netlify Edge Functions that:
- Run on the server-side
- Securely access the service role key from environment variables
- Provide a secure API for admin operations
- Properly log and handle errors

## Edge Functions

### 1. admin-update-member.js

**Purpose**: Updates member data in the database

**Endpoint**: `/.netlify/functions/admin-update-member`

**Method**: POST

**Request Body**:
```json
{
  "memberId": 12345,
  "updatedData": {
    "siege_score": 100,
    "hidden": false,
    ...
  }
}
```

**Used By**:
- `src/hooks/useMembers.js` - `updateMember()` function
- `src/components/admin/AdminMemberTable.jsx` - For updating siege scores and member details

**RPC Function**: Calls `admin_update_member(member_id, updated_data)`

---

### 2. admin-delete-member.js

**Purpose**: Deletes a member from the database

**Endpoint**: `/.netlify/functions/admin-delete-member`

**Method**: POST

**Request Body**:
```json
{
  "womId": 12345
}
```

**Used By**:
- `src/hooks/useMembers.js` - `deleteMember()` function
- `src/pages/AdminPage.jsx` - `handleDeleteMember()` function

---

### 3. admin-toggle-member-visibility.js

**Purpose**: Toggles the visibility of a member (hidden/shown)

**Endpoint**: `/.netlify/functions/admin-toggle-member-visibility`

**Method**: POST

**Request Body**:
```json
{
  "memberId": 12345,
  "isHidden": true
}
```

**Used By**:
- `src/hooks/useMembers.js` - `toggleMemberVisibility()` function
- `src/components/admin/AdminMemberTable.jsx` - Hide/Unhide member buttons

**RPC Function**: Calls `admin_toggle_member_visibility(member_id, is_hidden)`

---

### 4. admin-toggle-user-admin.js

**Purpose**: Toggles admin status for a user

**Endpoint**: `/.netlify/functions/admin-toggle-user-admin`

**Method**: POST

**Request Body**:
```json
{
  "userId": 123,
  "isAdmin": true
}
```

**Used By**:
- `src/context/AuthContext.jsx` - `toggleAdminStatus()` function
- `src/components/admin/AdminUserManager.jsx` - Grant/Remove admin privileges

---

## Required Supabase RLS Policies

For these edge functions to work properly, you need to ensure the following:

### 1. Service Role Key Configuration

In your Netlify environment variables, set:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**IMPORTANT**: The service role key should ONLY be set in Netlify environment variables, NEVER in client-side code or committed to git.

### 2. Required RPC Functions

The following PostgreSQL functions must exist in your Supabase database:

#### admin_update_member
```sql
CREATE OR REPLACE FUNCTION admin_update_member(
  member_id INTEGER,
  updated_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
  SET
    siege_score = COALESCE((updated_data->>'siege_score')::INTEGER, siege_score),
    hidden = COALESCE((updated_data->>'hidden')::BOOLEAN, hidden),
    -- Add other fields as needed
    updated_at = NOW()
  WHERE wom_id = member_id;
END;
$$;
```

#### admin_toggle_member_visibility
```sql
CREATE OR REPLACE FUNCTION admin_toggle_member_visibility(
  member_id INTEGER,
  is_hidden BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
  SET hidden = is_hidden, updated_at = NOW()
  WHERE wom_id = member_id;
END;
$$;
```

### 3. RLS Policies for Public Access

Since the edge functions use the service role key (which bypasses RLS), you need to ensure:

1. **Members Table**: Allow public SELECT on non-hidden members
```sql
CREATE POLICY "Allow public read access to visible members"
  ON members FOR SELECT
  USING (hidden = false OR hidden IS NULL);
```

2. **Users Table**: Restrict access appropriately
```sql
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = supabase_auth_id);
```

## Local Development Setup

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**IMPORTANT**: Add `.env` to `.gitignore` to prevent committing secrets!

### 3. Run Netlify Dev
```bash
netlify dev
```

This will:
- Start the Vite dev server
- Run edge functions locally
- Load environment variables from `.env`

### 4. Test Edge Functions

Test an edge function locally:
```bash
curl -X POST http://localhost:8888/.netlify/functions/admin-update-member \
  -H "Content-Type: application/json" \
  -d '{"memberId": 12345, "updatedData": {"siege_score": 100}}'
```

## Troubleshooting

### Edge Function Returns 500 Error

**Possible Causes**:
1. Missing environment variables
2. Invalid service role key
3. RPC function doesn't exist in Supabase
4. Database connection issue

**Debug Steps**:
1. Check Netlify function logs: `netlify functions:log`
2. Verify environment variables are set in Netlify dashboard
3. Test RPC functions directly in Supabase SQL editor
4. Check Supabase logs for errors

### Admin Operations Not Working in Production

**Possible Causes**:
1. Environment variables not set in Netlify
2. Edge functions not deployed
3. CORS issues

**Debug Steps**:
1. Check Netlify environment variables in dashboard
2. Verify functions are deployed: `netlify functions:list`
3. Check browser console for CORS errors
4. Verify CORS headers in edge function responses

### RLS Policy Blocking Operations

If you see "permission denied" errors:

1. Verify the edge function is using the service role key (not anon key)
2. Check that RPC functions have `SECURITY DEFINER` set
3. Ensure RLS policies allow the required operations

## Security Best Practices

1. **Never expose the service role key**: Only use it in edge functions/backend code
2. **Validate inputs**: Always validate and sanitize user inputs in edge functions
3. **Use RPC functions**: Prefer RPC functions over direct table updates for complex operations
4. **Log admin actions**: Consider adding audit logging for admin operations
5. **Rate limiting**: Implement rate limiting for admin endpoints if needed
6. **Authentication**: Always verify user is admin before calling admin endpoints

## Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Supabase Service Role Key](https://supabase.com/docs/guides/api/api-keys)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
