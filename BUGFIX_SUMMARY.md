# Admin Auth Bug Fix Summary

## Issue
Admin authentication was failing, preventing hide/unhide members, approve claim requests, and other admin operations.

## Root Cause
The hardcoded admin login was setting localStorage flags but **not creating a Supabase auth session**. Edge functions require:
1. Valid JWT token from Supabase
2. User record with `supabase_auth_id` matching the token
3. `is_admin = true` on that user

The original code attempted to create a session but used the **password hash** instead of the actual password, causing silent failures.

## Symptoms
- Console log: "Using regular client" instead of "Using admin client with RLS"
- `localStorage` showed `adminAuth: 'true'` and `useServiceRole: 'true'` but `userId: null`
- Admin operations failed with "Missing Supabase session token"

## Changes Made

### 1. Environment Configuration (`.env.example`)
Added required environment variables:
```bash
VITE_ADMIN_SUPABASE_EMAIL=admin@siegeclan.org
VITE_ADMIN_SUPABASE_PASSWORD=your-secure-password-here
```

### 2. AuthContext (`src/context/AuthContext.jsx`)

#### Added `ensureAdminUserRecord()` helper
- Creates or updates admin user record in database
- Links Supabase auth ID to user record
- Sets `is_admin = true`

#### Fixed admin login flow
- Uses environment variables for Supabase credentials
- Creates Supabase session with **actual password** (not hash)
- Falls back to creating account if sign-in fails
- Calls `ensureAdminUserRecord()` to link auth ID
- Improved error handling with user-friendly messages

#### Updated logout function
- Now async to properly sign out from Supabase
- Clears auth session AND localStorage

### 3. Documentation

#### `ADMIN_SETUP.md`
Complete setup guide including:
- Problem overview
- Configuration steps
- Verification procedures
- Troubleshooting guide
- Security considerations

#### `BUGFIX_SUMMARY.md` (this file)
Technical summary of the bug and fix

### 4. Tests (`src/__tests__/AuthContext.admin.test.jsx`)
Comprehensive test suite covering:
- Supabase session creation on login
- Admin user record creation/update
- Error handling for missing env variables
- Account creation fallback
- Logout session clearing

## Migration Steps

For users experiencing this issue:

1. **Add environment variables to `.env`:**
   ```bash
   VITE_ADMIN_SUPABASE_EMAIL=admin@siegeclan.org
   VITE_ADMIN_SUPABASE_PASSWORD=[choose-secure-password]
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Log out and log back in as admin**

4. **Verify in console:**
   - Should see "Admin authenticated with Supabase successfully"
   - Should see "Admin user updated with supabase_auth_id: [UUID]"

5. **Test admin functions:**
   - Try hiding/unhiding a member
   - Try approving a claim request

## Technical Details

### Authentication Flow (Before Fix)
```
1. User logs in with hardcoded admin credentials
2. System sets localStorage flags ✓
3. System tries to create Supabase session with password HASH ✗
4. Sign-in fails silently
5. Admin operations fail - no JWT token available
```

### Authentication Flow (After Fix)
```
1. User logs in with hardcoded admin credentials
2. System sets localStorage flags ✓
3. System creates Supabase session with actual PASSWORD ✓
4. System creates/updates user record with supabase_auth_id ✓
5. Admin operations succeed - valid JWT token available ✓
```

### Edge Function Validation
Edge functions validate admin requests via `validateAuth()` in `netlify/functions/utils/adminHelpers.js`:

1. Extract Bearer token from Authorization header
2. Validate JWT using `supabase.auth.getUser(token)`
3. Look up user by `supabase_auth_id` in database
4. Verify `is_admin = true`

## Security Improvements

1. **Separation of Concerns**: Hardcoded login credentials are separate from Supabase auth credentials
2. **Environment Variables**: Sensitive credentials stored in `.env` (gitignored)
3. **Proper Session Management**: Sessions are properly created and destroyed
4. **Error Handling**: Clear error messages without exposing sensitive data

## Regression Prevention

Tests added to prevent this issue from recurring:
- `src/__tests__/AuthContext.admin.test.jsx` - 8 test cases covering:
  - Session creation
  - User record management
  - Error scenarios
  - Environment validation

## Related Files
- `src/context/AuthContext.jsx` - Main auth logic
- `src/hooks/useMembers.js` - Uses `getAuthHeaders()` requiring valid session
- `netlify/functions/utils/adminHelpers.js` - Validates admin JWT tokens
- `netlify/functions/admin-toggle-member-visibility.js` - Example admin edge function

## Breaking Changes
**REQUIRED**: Must set `VITE_ADMIN_SUPABASE_PASSWORD` in `.env` or admin login will fail with a clear error message.

## Non-Breaking Changes
All other functionality remains unchanged. Regular user login/registration unaffected.
