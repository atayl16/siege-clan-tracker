# Edge Functions Security Tests

This directory contains security-focused tests for the edge functions authentication system.

## Test Files

### `auth.test.js`
Tests the constant-time comparison function and API key validation:
- **Constant-Time Comparison**: Verifies `constantTimeEqual()` prevents timing attacks
- **Null/Undefined Handling**: Ensures safe handling of invalid inputs
- **Timing Attack Prevention**: Validates that execution time doesn't leak information
- **Edge Cases**: Tests special characters, unicode, long strings

**Critical Security Properties Tested:**
- ✅ No early exits that leak timing information
- ✅ All bytes processed regardless of mismatch location
- ✅ Safe handling of null/undefined inputs
- ✅ Case-sensitive comparison

### `admin-auth.test.js`
Documents the expected behavior of JWT-based admin authentication:
- **JWT Token Validation**: Bearer token extraction and verification
- **Admin Status Verification**: Checking `is_admin` flag in database
- **Error Handling**: Proper error codes and messages
- **Security Properties**: No client-side secrets, fresh validation per request

**Includes Manual Testing Checklist:**
- Admin login flow verification
- Admin CRUD operations testing
- Non-admin user rejection
- Expired token handling
- Malformed JSON handling

### `cors.test.js`
Tests CORS security validation (in `../../../functions/_shared/__tests__/cors.test.js`):
- **Wildcard Protection**: Blocks `*` origin
- **Protocol Validation**: Only allows http/https
- **URL Format Validation**: Rejects paths, queries, fragments
- **Credentials Validation**: Blocks embedded credentials
- **Port Validation**: Validates port range 1-65535
- **Domain Validation**: Handles subdomains, localhost, IPs

## Running the Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx vitest run netlify/edge-functions/_shared/__tests__/auth.test.js
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

| Module | Unit Tests | Integration Tests | Manual Tests Required |
|--------|-----------|-------------------|----------------------|
| `constantTimeEqual()` | ✅ Complete | N/A | ❌ No |
| `validateApiKey()` | ⚠️  Partial | ❌ Needs mocking | ✅ **YES** |
| Admin Auth (JWT) | ⚠️  Documented | ❌ Needs Supabase mocking | ✅ **YES** |
| CORS Validation | ✅ Complete | N/A | ❌ No |

## Manual Testing Required

**IMPORTANT:** Before merging PR 43, perform the following manual tests in a deployed environment:

### 1. Admin Login Flow
- [ ] Log in as admin user
- [ ] Verify JWT token is present in Authorization header
- [ ] Verify no secrets stored in localStorage
- [ ] Check Network tab: Bearer token in requests

### 2. Admin CRUD Operations
- [ ] Update a member → verify success
- [ ] Delete a member → verify success
- [ ] Toggle member visibility → verify success
- [ ] Toggle user admin status → verify success

### 3. Authentication Security
- [ ] Try admin operation as non-admin user → expect 401
- [ ] Try admin operation without token → expect 401
- [ ] Try admin operation with expired token → expect 401
- [ ] Try admin operation with invalid token → expect 401

### 4. API Key Validation
- [ ] Call edge function with valid API key → expect 200
- [ ] Call edge function with invalid API key → expect 401
- [ ] Call edge function without API key → expect 401 (or warning logged)
- [ ] Verify `curl -H 'Origin: https://siege-clan.com' /api/members` is rejected (no same-origin bypass)

### 5. Error Handling
- [ ] Send malformed JSON to admin endpoint → expect 400 (not 500)
- [ ] Send invalid ALLOWED_ORIGIN → expect startup error
- [ ] Test CORS preflight (OPTIONS request) → expect 204

### 6. Security Regressions
- [ ] Verify no VITE_ADMIN_SECRET in client code
- [ ] Verify Origin/Referer headers don't bypass auth
- [ ] Verify constant-time comparison is used for API keys

## Security Test Results

After running tests, you should see:

```
✓ constantTimeEqual - Security Function (XX tests)
✓ CORS Wildcard Protection (XX tests)
✓ Protocol Validation (XX tests)
✓ Port Validation (XX tests)
...
```

## Known Limitations

1. **No Deno Environment Testing**: Edge functions run in Deno, but tests run in Node.js
   - Solution: Tests replicate the logic for verification
   - Deployment testing required for full validation

2. **No Supabase Mocking**: Admin auth tests are specifications only
   - Solution: Manual testing checklist provided
   - Consider adding Supabase test doubles in future

3. **No Network Testing**: CORS headers not tested end-to-end
   - Solution: Use browser DevTools to verify CORS headers
   - Check Network tab for preflight requests

## Contributing

When adding new security features:
1. Write unit tests first (TDD approach)
2. Document manual testing requirements
3. Update this README with new test coverage
4. Run full test suite before committing

## Security Contact

If you discover a security vulnerability in the authentication system:
1. Do NOT open a public issue
2. Contact the repository owner privately
3. Provide details of the vulnerability
4. Wait for acknowledgment before disclosure
