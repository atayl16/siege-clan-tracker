# Testing Requirements for Siege Clan Tracker

## Critical User Flows That MUST Be Tested

### 1. Member Claim Request Flow
**Test Before Every Deployment**

- [ ] User can submit claim request
- [ ] Admin sees pending requests
- [ ] Admin can click Approve button
- [ ] Modal opens with request details
- [ ] Admin can add notes
- [ ] Approve button calls edge function
- [ ] `claim_requests.status` updates to 'approved'
- [ ] `members.claimed_by` updates to user_id
- [ ] User sees claimed member in profile

**Test Files:**
- `src/__tests__/claim-flows.integration.test.jsx`
- Frontend component tests

**Command:** `npm run test:integration`

---

### 2. Claim Code Generation Flow
**Test Before Every Deployment**

- [ ] Admin can select unclaimed member
- [ ] Generate button creates random code
- [ ] `members.claim_code` updates with code
- [ ] Code displays on screen
- [ ] Code can be copied
- [ ] Only unclaimed members shown

**Test Files:**
- `src/__tests__/claim-flows.integration.test.jsx`

**Command:** `npm run test:integration`

---

### 3. Claim Code Redemption Flow
**Test Before Every Deployment**

- [ ] User enters claim code
- [ ] Edge function validates code exists
- [ ] Edge function checks not already claimed
- [ ] `members.claimed_by` updates to user_id
- [ ] `members.claim_code` cleared to null
- [ ] User sees claimed member immediately
- [ ] Invalid codes show error
- [ ] Already claimed codes show error

**Test Files:**
- `src/__tests__/claim-flows.integration.test.jsx`
- `netlify/edge-functions/__tests__/claim-flows.test.js`

**Command:** `npm run test:integration`

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Only Integration Tests
```bash
npm run test:integration
```

### Run Tests in Watch Mode (during development)
```bash
npm run test:watch
```

### Run With Coverage
```bash
npm run test:coverage
```

---

## Pre-Deployment Checklist

**BEFORE pushing to staging or main:**

1. ✅ Run all tests: `npm test`
2. ✅ Run integration tests: `npm run test:integration`
3. ✅ Verify all edge functions have tests
4. ✅ Check no console errors in local dev
5. ✅ Test critical flows manually in localhost

---

## When to Write New Tests

### Always write tests when:
- Adding a new user flow
- Modifying database operations
- Creating/updating edge functions
- Changing authentication logic
- Updating claim-related features

### Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should handle happy path', async () => {
    // Test success case
  });

  it('should handle errors', async () => {
    // Test error cases
  });

  it('should validate inputs', async () => {
    // Test validation
  });
});
```

---

## Common Issues and Solutions

### Issue: Tests pass but production fails
**Cause:** Mocks don't match real behavior

**Solution:**
1. Add integration tests that use real API calls
2. Test against staging database
3. Add E2E tests with Playwright/Cypress

### Issue: Edge functions not tested
**Cause:** Edge functions use Deno, hard to test with Vitest

**Solution:**
1. Extract business logic to separate functions
2. Test logic separately from edge function wrapper
3. Use manual testing for edge function integration

### Issue: Database schema mismatch
**Cause:** Tests use mocked data that doesn't match real schema

**Solution:**
1. Keep test data synced with migrations
2. Add schema validation tests
3. Test against real staging database

---

## Future Improvements

### High Priority
- [ ] Add Playwright E2E tests for critical flows
- [ ] Set up CI to run tests on PRs
- [ ] Add pre-commit hook to run tests
- [ ] Create staging database for integration tests

### Medium Priority
- [ ] Add visual regression testing
- [ ] Test edge functions with real Deno runtime
- [ ] Add performance tests
- [ ] Monitor test coverage (target: 80%+)

### Low Priority
- [ ] Add accessibility tests
- [ ] Test mobile responsive flows
- [ ] Add load testing for edge functions

---

## Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Claim Flows | 0% | 90% |
| Auth Flows | 20% | 90% |
| Admin Features | 10% | 80% |
| User Profile | 30% | 80% |
| Overall | 25% | 80% |

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
