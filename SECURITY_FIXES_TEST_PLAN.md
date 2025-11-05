# Security and Bug Fixes - Test Plan

## Summary of Changes

This PR implements critical security fixes and bug fixes as outlined in TASKS.md Prompt #1.

### Part 1: Security - API Key Authentication

**Changes:**
- Created `netlify/edge-functions/_shared/auth.js` - Authentication middleware for edge functions
- Updated edge functions to use API key authentication:
  - `netlify/edge-functions/members.js`
  - `netlify/edge-functions/events.js`
  - `netlify/edge-functions/users.js`
  - `netlify/edge-functions/claim-requests.js`
  - `netlify/edge-functions/user-goals.js`
  - `netlify/edge-functions/races.js`

**Security Features:**
- Validates `x-api-key` header for external requests
- Allows same-origin requests without API key (checks Origin/Referer headers)
- Returns 401 Unauthorized for invalid/missing API keys
- Backward compatible (allows requests if no API key is configured in environment)

**Testing:**
1. Test same-origin requests work without API key
2. Test external requests require valid API key
3. Test invalid API key returns 401
4. Test OPTIONS (CORS preflight) requests work

### Part 2: Fix CORS from Wildcard to Specific Domain

**Changes:**
- Updated all edge functions to use `ALLOWED_ORIGIN` env var (defaults to `https://siegeclan.com`)
- Updated regular Netlify functions:
  - `netlify/functions/discord.js`
  - `netlify/functions/members.js`
  - `netlify/functions/events.js`

**Testing:**
1. Verify CORS headers include correct origin
2. Test cross-origin requests from allowed domain
3. Test cross-origin requests from unauthorized domains are blocked

### Part 3: Critical Bug Fixes

#### 3.1 Cache TTL Fixes
**Fixed incorrect TTL values (were in milliseconds instead of seconds):**
- `netlify/edge-functions/events.js`: Line 12 - Changed from 3000 to 300
- `netlify/edge-functions/users.js`: Line 12 - Changed from 3000 to 300
- `netlify/edge-functions/user-goals.js`: Line 12 - Changed from 3000 to 300
- `netlify/edge-functions/claim-requests.js`: Line 12 - Changed from 9000 to 900
- `netlify/edge-functions/races.js`: Line 12 - Changed from 3000 to 300

**Testing:**
1. Verify cached responses expire at correct intervals
2. Check CDN-Cache-Control headers

#### 3.2 Cache Tag Fix
**Fixed incorrect cache tag:**
- `netlify/edge-functions/events.js`: Line 47 - Changed from 'supabase-members' to 'supabase-events'
- `netlify/edge-functions/users.js`: Changed to 'supabase-users'
- `netlify/edge-functions/claim-requests.js`: Changed to 'supabase-claim-requests'
- `netlify/edge-functions/user-goals.js`: Changed to 'supabase-user-goals'
- `netlify/edge-functions/races.js`: Changed to 'supabase-races'

**Testing:**
1. Verify cache invalidation works correctly for each resource type

#### 3.3 Export Syntax Fix
**Fixed module export:**
- `netlify/functions/anniversaries.js`: Line 156 - Changed from `export { sendAnniversaries }` to `module.exports = { sendAnniversaries }`

**Testing:**
1. Test anniversaries function can be imported correctly
2. Test scheduled anniversary checks run without errors

#### 3.4 Date Calculation Fix
**Fixed anniversary years calculation to check month+day:**
- `netlify/functions/anniversaries.js`: Lines 36-52
- `scripts/sync-tasks/anniversaries.cjs`: Lines 44-63

**Before:** Only checked year difference, could show incorrect years if anniversary hasn't occurred yet this year
**After:** Properly checks if anniversary date has passed this year before calculating years

**Testing:**
1. Test anniversary calculation for someone who joined in December (current month < join month)
2. Test anniversary calculation for someone who joined earlier in the year
3. Verify years are calculated correctly on the exact anniversary date

#### 3.5 SQL Injection Fix
**Fixed SQL injection vulnerability:**
- `scripts/sync-tasks/wom-events.cjs`: Line 585 - Changed from string concatenation to proper `.in()` filter

**Before:** `or(\`wom_name.in.(${usernames.map(...).join(',')})\`)`
**After:** `.in("wom_name", allNames)`

**Testing:**
1. Test with normal usernames
2. Test with usernames containing special characters (', ", ;, --, etc.)
3. Verify query results are correct

### Part 4: Error Handling Improvements

#### 4.1 JSON Parsing
**Added try-catch for JSON parsing:**
- `netlify/functions/discord.js`: Lines 23-32

**Testing:**
1. Test with valid JSON request body
2. Test with invalid JSON - should return 400 with proper error message
3. Verify CORS headers are included in error responses

#### 4.2 CORS Headers on Error Responses
**Added CORS headers to all error responses:**
- All edge functions now include CORS headers in error responses
- All regular functions include CORS headers in error responses

**Testing:**
1. Trigger various error conditions
2. Verify all error responses include proper CORS headers

#### 4.3 Debug Logs Removal
**Removed debug console.log statements:**
- `netlify/functions/members.js`: Lines 10-14 (removed environment variable logging)

**Testing:**
1. Verify function works without debug logs
2. Check production logs are cleaner

### Part 5: Input Validation

#### 5.1 Player ID Validation
**Added numeric validation for player ID:**
- `netlify/edge-functions/wom-player.js`: Lines 22-31

**Testing:**
1. Test with valid numeric player ID
2. Test with non-numeric player ID - should return 400
3. Test with missing player ID - should return 400
4. Test with player ID containing special characters

## Environment Variables Required

Add these to Netlify:

```bash
# Security
API_KEY=<generate 32-char random string>
ALLOWED_ORIGIN=https://siegeclan.com
```

Generate API key:
```bash
openssl rand -hex 32
```

## Deployment Testing Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Code review completed
- [ ] Environment variables documented

### Post-Deployment (Staging/Preview)
- [ ] Test all edge functions with valid API key
- [ ] Test edge functions without API key (should fail with 401)
- [ ] Test same-origin requests work
- [ ] Test CORS from allowed origin
- [ ] Test CORS from disallowed origin (should fail)
- [ ] Test anniversary calculations
- [ ] Test WOM events sync with various username formats
- [ ] Verify cache headers are correct
- [ ] Check error responses include CORS headers

### Production Deployment
- [ ] Deploy during low-traffic hours
- [ ] Monitor error logs for first 30 minutes
- [ ] Verify all public endpoints work
- [ ] Test authenticated admin endpoints
- [ ] Check Discord webhooks still work
- [ ] Verify automated jobs run successfully

## Rollback Plan

If issues occur:
1. Revert to previous deployment via Netlify dashboard
2. Check environment variables are set correctly
3. Review error logs for specific issues
4. Fix and redeploy

## Security Notes

- API keys are validated but gracefully fall back if not configured
- Same-origin requests bypass API key requirement for backward compatibility
- All CORS is restricted to specific domain
- SQL injection vulnerability is fixed using parameterized queries
- No sensitive data is logged

## Performance Impact

- Minimal impact expected
- Cache TTLs are now correct (previously too long)
- SQL query optimization in wom-events.cjs (removed duplicate lookups)
- Authentication check adds ~1-2ms overhead per request
