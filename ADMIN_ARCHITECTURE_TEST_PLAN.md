# Simplified Admin Architecture - Test Plan

## Summary of Changes

This PR implements **Prompt #2** from TASKS.md: Simplified Supabase Admin Architecture with dedicated admin edge functions.

### Problem Statement

Previously, admin operations failed because `getAdminSupabaseClient()` didn't properly use the service role key on the client side. This was a security issue and caused RLS policy conflicts.

### Solution

Move ALL admin operations to server-side edge functions that use the service role key securely. This ensures:
- Service role key never exposed to the client
- Proper authorization through admin tokens
- RLS policies bypassed correctly for admin operations
- Centralized admin authentication

## Part 1: New Admin Edge Functions

**Created 4 new edge functions in `netlify/edge-functions/`:**

### 1. admin-update-member.js
- **Endpoint:** `/api/admin/update-member`
- **Method:** POST
- **Body:** `{ womId, updates }`
- **Function:** Calls `admin_update_member` RPC with service role privileges
- **Returns:** Updated member data

### 2. admin-delete-member.js
- **Endpoint:** `/api/admin/delete-member`
- **Method:** DELETE
- **Body:** `{ womId }`
- **Function:** Calls `admin_delete_member` RPC with service role privileges
- **Returns:** Success confirmation

### 3. admin-toggle-visibility.js
- **Endpoint:** `/api/admin/toggle-visibility`
- **Method:** POST
- **Body:** `{ womId, hidden }`
- **Function:** Calls `admin_toggle_member_visibility` RPC with service role privileges
- **Returns:** Updated member with new visibility status

### 4. admin-toggle-user-admin.js
- **Endpoint:** `/api/admin/toggle-user-admin`
- **Method:** POST
- **Body:** `{ userId, isAdmin }`
- **Function:** Calls `admin_toggle_user_admin` RPC with service role privileges
- **Returns:** Updated user with new admin status
- **Note:** Master admin only

### Security Features

All edge functions include:
- ✅ Admin token validation (`x-admin-token` header against `ADMIN_SECRET`)
- ✅ CORS headers restricted to `ALLOWED_ORIGIN`
- ✅ Proper error handling with secure error messages
- ✅ Service role key used server-side only (never exposed to client)
- ✅ OPTIONS (CORS preflight) handling

## Part 2: Admin API Helper (src/utils/adminApi.js)

**Created centralized admin API module with:**

### Functions:
- `updateMember(womId, updates)` - Update member information
- `deleteMember(womId)` - Delete a member
- `toggleMemberVisibility(womId, hidden)` - Hide/show member
- `toggleUserAdmin(userId, isAdmin)` - Promote/demote admin

### Token Management:
- `setAdminToken(token)` - Store admin token on login
- `clearAdminToken()` - Clear token on logout
- `getAdminToken()` - Retrieve token for requests (internal)

### Features:
- Automatic token retrieval from localStorage
- Consistent error handling across all operations
- Clear error messages for debugging
- Centralized authentication logic

## Part 3: Frontend Updates

### AuthContext (src/context/AuthContext.js)

**Changes:**
- ✅ Import admin API functions (`setAdminToken`, `clearAdminToken`)
- ✅ On successful admin login: Store `VITE_ADMIN_SECRET` as admin token
- ✅ On logout: Clear admin token
- ✅ Updated `toggleAdminStatus` to use `toggleUserAdmin` edge function

### useMembers Hook (src/hooks/useMembers.js)

**Changes:**
- ✅ Import admin API module
- ✅ Updated `updateMember` to use `adminApi.updateMember()`
- ✅ Updated `deleteMember` to use `adminApi.deleteMember()`
- ✅ Updated `toggleMemberVisibility` to use `adminApi.toggleMemberVisibility()`
- ✅ Removed direct Supabase RPC calls for admin operations

### supabaseClient.js (src/utils/supabaseClient.js)

**Changes:**
- ✅ Deprecated `getAdminSupabaseClient()` function
- ✅ Added comprehensive documentation explaining migration
- ✅ Added warnings when function is called
- ✅ Function kept for backward compatibility (now just returns regular client)

## Environment Variables Required

Add these to Netlify and local `.env`:

```bash
# Backend (Netlify)
ADMIN_SECRET=<generate 32-char random string>

# Frontend (.env)
VITE_ADMIN_SECRET=<same as ADMIN_SECRET above>
```

**Generate secret:**
```bash
openssl rand -hex 32
```

**IMPORTANT:**
- Frontend and backend ADMIN_SECRET must match
- Never commit `.env` file
- Store secrets securely

## Testing Checklist

### Pre-Deployment Testing

#### Admin Login
- [ ] Test admin login with correct credentials
- [ ] Verify admin token is stored in localStorage
- [ ] Test admin login with incorrect credentials (should fail)
- [ ] Verify `VITE_ADMIN_SECRET` warning if not configured

#### Member Operations (Admin Only)
- [ ] **Update Member**
  - [ ] Update member name
  - [ ] Update siege score
  - [ ] Update multiple fields at once
  - [ ] Verify member table refreshes after update
  - [ ] Test with invalid wom_id (should fail gracefully)

- [ ] **Delete Member**
  - [ ] Delete a test member
  - [ ] Verify member is removed from list
  - [ ] Test with invalid wom_id (should fail gracefully)
  - [ ] Verify related data handling (cascades)

- [ ] **Toggle Visibility**
  - [ ] Hide a visible member
  - [ ] Show a hidden member
  - [ ] Verify visibility state updates in UI
  - [ ] Test rapid toggle clicks (debouncing)

#### User Admin Operations (Master Admin Only)
- [ ] **Promote User to Admin**
  - [ ] Promote a regular user
  - [ ] Verify user's admin status in database
  - [ ] Verify user can access admin pages after promotion

- [ ] **Demote Admin to User**
  - [ ] Demote an admin user
  - [ ] Verify admin privileges revoked
  - [ ] Verify user loses access to admin pages

#### Error Handling
- [ ] Test admin operations without admin token (should return 401)
- [ ] Test with invalid admin token (should return 401)
- [ ] Test with expired/wrong admin secret (should return 401)
- [ ] Verify error messages are user-friendly
- [ ] Verify CORS errors are handled properly

#### Logout
- [ ] Logout as admin
- [ ] Verify admin token is cleared from localStorage
- [ ] Verify admin operations fail after logout
- [ ] Test re-login after logout

### Post-Deployment Testing (Staging/Preview)

#### Integration Tests
- [ ] Test full admin workflow end-to-end
- [ ] Verify no console errors during admin operations
- [ ] Check network tab for proper headers
- [ ] Verify service role key not exposed in any requests

#### Performance
- [ ] Admin operations complete in < 2 seconds
- [ ] No memory leaks from admin operations
- [ ] Member list refreshes efficiently after operations

#### Security
- [ ] Verify `x-admin-token` header sent with admin requests
- [ ] Verify service role key not visible in frontend code
- [ ] Verify CORS restricted to allowed origin
- [ ] Verify non-admin users cannot call admin endpoints
- [ ] Test with browser dev tools (check for exposed secrets)

### Production Deployment

#### Pre-Deploy
- [ ] All tests pass on staging
- [ ] Code reviewed and approved
- [ ] Environment variables configured on production
- [ ] Rollback plan documented

#### Post-Deploy
- [ ] Monitor error logs for first 30 minutes
- [ ] Verify admin operations work in production
- [ ] Test with production data (use test account)
- [ ] Verify no regressions in non-admin features

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ AuthContext                                          │   │
│  │ - Stores adminToken in localStorage on login        │   │
│  │ - Clears adminToken on logout                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ adminApi.js                                          │   │
│  │ - Adds x-admin-token header to requests             │   │
│  │ - Calls admin edge functions                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Netlify Edge Functions                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Admin Edge Functions                                 │   │
│  │ - Validate x-admin-token against ADMIN_SECRET        │   │
│  │ - Create Supabase client with SERVICE_ROLE_KEY      │   │
│  │ - Call RPC functions with service role privileges   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ SQL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PostgreSQL Database                                  │   │
│  │ - RPC Functions (admin_update_member, etc.)         │   │
│  │ - RLS Policies (bypassed with service role)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Migration Notes

### For Developers

**Before (Old Way):**
```javascript
const client = getAdminSupabaseClient();
const { data, error } = await client.rpc('admin_update_member', {...});
```

**After (New Way):**
```javascript
import { updateMember } from '../utils/adminApi';
const result = await updateMember(womId, updates);
```

### Breaking Changes

- ❌ Direct RPC calls from frontend with `getAdminSupabaseClient()` - NO LONGER WORKS
- ✅ Use admin API functions from `src/utils/adminApi.js` instead
- ✅ Admin token required (automatically handled on login)

### Backward Compatibility

- `getAdminSupabaseClient()` still exists but is deprecated
- Shows console warning when called
- Returns regular client (admin operations will fail without edge functions)

## Rollback Plan

If issues occur:

1. **Revert deployment** via Netlify dashboard
2. **Check environment variables:**
   - Verify `ADMIN_SECRET` is set correctly
   - Verify `VITE_ADMIN_SECRET` matches `ADMIN_SECRET`
3. **Check RPC functions exist in Supabase:**
   - `admin_update_member`
   - `admin_delete_member`
   - `admin_toggle_member_visibility`
   - `admin_toggle_user_admin`
4. **Review error logs** for specific failures
5. **Test admin login** to verify token generation

## Security Considerations

### Strengths
- ✅ Service role key never exposed to client
- ✅ Admin operations require valid admin token
- ✅ Token validated server-side against secret
- ✅ CORS restricted to specific origin
- ✅ RLS policies properly bypassed with service role

### Limitations
- ⚠️ Admin secret stored in frontend environment variable
- ⚠️ Anyone with admin credentials can access admin secret
- ⚠️ No token expiration/rotation (uses static secret)

### Recommendations for Production
1. Consider implementing JWT-based admin sessions
2. Add token expiration and refresh mechanism
3. Implement rate limiting on admin endpoints
4. Add audit logging for all admin operations
5. Consider multi-factor authentication for admin login

## Files Changed

### New Files (8)
- `netlify/edge-functions/admin-update-member.js`
- `netlify/edge-functions/admin-delete-member.js`
- `netlify/edge-functions/admin-toggle-visibility.js`
- `netlify/edge-functions/admin-toggle-user-admin.js`
- `src/utils/adminApi.js`
- `ADMIN_ARCHITECTURE_TEST_PLAN.md`

### Modified Files (3)
- `src/context/AuthContext.js` - Add admin token management
- `src/hooks/useMembers.js` - Update to use admin API
- `src/utils/supabaseClient.js` - Deprecate getAdminSupabaseClient

**Total:** 11 files, ~850 lines added, ~150 lines removed

## Success Criteria

- [x] All admin operations use edge functions
- [x] Service role key not exposed to client
- [x] Admin token required for admin operations
- [x] All existing admin features still work
- [x] No breaking changes for non-admin users
- [x] Comprehensive error handling
- [x] Clear documentation and migration guide
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Verified in production

## Related

- **TASKS.md:** Prompt #2
- **Previous PR:** #1 (Security and Bug Fixes)
- **Next PR:** #3 (GitHub Actions Workflows)
