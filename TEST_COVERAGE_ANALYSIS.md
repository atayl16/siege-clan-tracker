# Test Coverage Analysis & Recommendations
## Siege Clan Tracker

**Date**: 2025-01-06
**Status**: 🔴 **CRITICAL - Minimal Test Coverage**
**Total Source Files**: 86
**Files With Tests**: 3 (3.5%)

---

## Executive Summary

The Siege Clan Tracker currently has **minimal test coverage** with only **3 test files** covering security functions. For an unpaid side project with no QA team, this represents a **critical risk**. The application has **86 source files** with **zero tests** for:

- ❌ All React components (30+ components)
- ❌ All business logic (utils, services)
- ❌ All React hooks (11 custom hooks)
- ❌ All Netlify functions (5 functions)
- ❌ All Edge functions (13 endpoints)
- ❌ All sync scripts (4 critical scripts)

**Impact**: Every code change risks breaking existing functionality with no automated safety net.

---

## Current Test Coverage

### ✅ What IS Tested (PR 43 only)

| File | Tests | Coverage |
|------|-------|----------|
| `netlify/edge-functions/_shared/auth.js` | 15 tests | ✅ constantTimeEqual, API key validation |
| `netlify/functions/_shared/cors.js` | 17 tests | ✅ CORS validation, wildcard protection |
| `netlify/edge-functions/_shared/admin-auth.js` | Specs only | ⚠️  Manual test checklist |

**Test Files**:
- `netlify/edge-functions/_shared/__tests__/auth.test.js` - 15 tests ✅
- `netlify/functions/_shared/__tests__/cors.test.js` - 17 tests ✅
- `netlify/edge-functions/_shared/__tests__/admin-auth.test.js` - Documentation only
- `run-tests-simple.js` - Custom test runner (32 tests pass)
- `test-functions.js` - Manual integration test for sync functions

---

## ❌ Critical Gaps - What's NOT Tested

### 1. **Business Logic** (HIGHEST RISK) 🔴

These functions contain complex calculations that directly impact user experience:

| File | Functions | Risk | Why Critical |
|------|-----------|------|--------------|
| **src/utils/rankUtils.js** | `calculateAppropriateRank`, `memberNeedsRankUpdate`, `calculateNextLevel` | 🔴 **CRITICAL** | Wrong rank calculation = incorrect member ranks shown |
| **src/utils/stringUtils.js** | `titleize` | 🟡 Low | Simple string formatting, low risk |
| **src/services/goalProgressService.js** | `extractMetricData`, `getPlayerStat`, goal calculation | 🔴 **CRITICAL** | Wrong goal progress = user frustration |

**Recommendation**: **MUST TEST** - These functions have complex logic with edge cases.

---

### 2. **React Hooks** (HIGH RISK) 🔴

11 custom hooks with NO tests:

| Hook | Purpose | Risk | Test Priority |
|------|---------|------|---------------|
| `useMembers` | Fetch and manage member data | 🔴 **CRITICAL** | **P0** - Used everywhere |
| `useClaimRequests` | Handle player claims | 🔴 **CRITICAL** | **P0** - Auth-dependent |
| `useUserGoals` | Manage user goals | 🟠 High | **P1** - Complex state |
| `useRaces` | Manage competitions | 🟠 High | **P1** - Complex state |
| `useEvents` | Event data management | 🟡 Medium | **P2** |
| `useCompetitions` | Competition management | 🟡 Medium | **P2** |
| `useUsers` | User data management | 🟠 High | **P1** |
| `usePlayer` | Single player data | 🟡 Medium | **P2** |
| `useGroup` | WOM group data | 🟡 Medium | **P2** |
| `useMetrics` | Metrics fetching | 🟡 Medium | **P2** |
| `useGroupAchievements` | Achievement tracking | 🟢 Low | **P3** |
| `useGroupStats` | Statistics display | 🟢 Low | **P3** |

**Recommendation**: Test hooks using `@testing-library/react-hooks`.

---

### 3. **React Components** (MEDIUM RISK) 🟠

30+ components with NO tests:

| Component Category | Risk | Test Priority |
|-------------------|------|---------------|
| **Admin Components** | 🔴 **CRITICAL** | **P0** |
| - `ClaimRequestManager` | 🔴 Critical | **P0** - Admin approval workflow |
| - `MemberEditor` | 🔴 Critical | **P0** - Data mutation |
| - `AdminMemberTable` | 🟠 High | **P1** - Complex display logic |
| **User Components** | 🟠 **HIGH** | **P1** |
| - `ClaimPlayer` | 🟠 High | **P1** - User claims |
| - `GoalCard` | 🟠 High | **P1** - Goal management |
| - `CreateRace` | 🟠 High | **P1** - Race creation |
| **Display Components** | 🟡 **MEDIUM** | **P2** |
| - `Leaderboard` | 🟡 Medium | **P2** - Display only |
| - `EventsTable` | 🟡 Medium | **P2** - Display only |
| - `ClanRanks` | 🟡 Medium | **P2** - Display only |

**Recommendation**: Use `@testing-library/react` for component tests.

---

### 4. **Netlify Functions** (HIGH RISK) 🔴

5 serverless functions with NO tests:

| Function | Purpose | Risk | Test Priority |
|----------|---------|------|---------------|
| `netlify/functions/discord.js` | Discord webhooks | 🟠 High | **P1** - User-facing notifications |
| `netlify/functions/runewatch-check.js` | Security checks | 🔴 **CRITICAL** | **P0** - Security feature |
| `netlify/functions/anniversaries.js` | Anniversary notifications | 🟡 Medium | **P2** |
| `netlify/functions/members.js` | Member data API | 🟡 Medium | **P2** |
| `netlify/functions/events.js` | Events API | 🟡 Medium | **P2** |

**Recommendation**: Write integration tests using mock event/context objects.

---

### 5. **Edge Functions** (HIGH RISK) 🔴

13 edge functions with NO tests (except auth helpers):

| Function | Purpose | Risk | Test Priority |
|----------|---------|------|---------------|
| `admin-*.js` (4 files) | Admin CRUD operations | 🔴 **CRITICAL** | **P0** - Added in PR 43 |
| `members.js` | Member data caching | 🟠 High | **P1** - Heavily used |
| `wom-player.js` | Player data proxy | 🟠 High | **P1** - Validated in PR 43 |
| `claim-requests.js` | Claim management | 🟠 High | **P1** |
| `user-goals.js` | Goal management | 🟠 High | **P1** |
| `races.js` | Race management | 🟡 Medium | **P2** |
| `events.js`, `users.js` | Data endpoints | 🟡 Medium | **P2** |
| `wom-*` (4 files) | WOM API proxies | 🟡 Medium | **P2** - Simple proxies |

**Recommendation**: Test request/response handling, error cases, auth integration.

---

### 6. **Sync Scripts** (CRITICAL RISK) 🔴

4 automated scripts running on schedule with NO tests:

| Script | Purpose | Risk | Impact if Broken |
|--------|---------|------|------------------|
| `sync-tasks/sync-wom.cjs` | Hourly member sync | 🔴 **CRITICAL** | Stale member data, broken leaderboards |
| `sync-tasks/wom-events.cjs` | Event synchronization | 🔴 **CRITICAL** | Missing events, incorrect competitions |
| `sync-tasks/runewatch-check.cjs` | Security scanning | 🔴 **CRITICAL** | Reported players not flagged |
| `sync-tasks/anniversaries.cjs` | Anniversary notifications | 🟡 Medium | Missed celebrations (low impact) |

**Recommendation**: **URGENT** - These run automatically and errors go unnoticed.

---

## Test Priority Matrix

### 🔴 **P0 - CRITICAL (Implement ASAP)**

Must have tests before merging any PRs:

1. **`src/utils/rankUtils.js`** - Rank calculation logic
   - Test all rank thresholds (Opal through Zenyte, Mentor through TzKal)
   - Test `memberNeedsRankUpdate` edge cases
   - Test `calculateNextLevel` for all ranks

2. **Admin Edge Functions** (4 functions)
   - Test authentication (JWT validation)
   - Test authorization (admin-only access)
   - Test error handling (malformed JSON, invalid IDs)
   - Test success paths (update, delete, toggle)

3. **`scripts/sync-tasks/sync-wom.cjs`**
   - Test WOM API integration (mock responses)
   - Test database updates
   - Test error handling (API down, DB failure)
   - Test idempotency (running multiple times)

4. **`scripts/sync-tasks/runewatch-check.cjs`**
   - Test RuneWatch API parsing
   - Test member matching logic
   - Test Discord notifications
   - Test no matches scenario

### 🟠 **P1 - HIGH (Implement This Sprint)**

5. **`src/hooks/useMembers.js`**
   - Test data fetching
   - Test error states
   - Test loading states
   - Test cache invalidation

6. **`src/hooks/useClaimRequests.js`**
   - Test claim submission
   - Test approval/rejection
   - Test user permissions
   - Test refresh logic

7. **`src/services/goalProgressService.js`**
   - Test metric extraction
   - Test goal calculations
   - Test edge cases (null data, missing skills)

8. **Admin Components**
   - `ClaimRequestManager` - Approval workflow
   - `MemberEditor` - Data validation
   - `AdminMemberTable` - Filtering/sorting

### 🟡 **P2 - MEDIUM (Implement Next Sprint)**

9. **Remaining Hooks** (useRaces, useEvents, useUsers, etc.)
10. **User-facing Components** (ClaimPlayer, GoalCard, CreateRace)
11. **Netlify Functions** (discord.js, events.js, members.js)
12. **WOM API Proxies** (wom-group.js, wom-player.js, etc.)

### 🟢 **P3 - LOW (Implement When Possible)**

13. **Display Components** (Leaderboard, EventsTable, ClanRanks)
14. **Simple Utilities** (stringUtils.js)
15. **Achievement/Stats Hooks** (useGroupAchievements, useGroupStats)

---

## Recommended Test Stack

Based on your existing setup:

```json
{
  "dependencies": {
    "vitest": "^3.1.2",                    // Already installed
    "@testing-library/react": "^16.3.0",   // Already installed
    "@testing-library/jest-dom": "^6.6.3", // Already installed
    "@testing-library/user-event": "^13.5.0", // Already installed
    "jsdom": "^24.0.0"                     // Already installed
  },
  "devDependencies": {
    "@testing-library/react-hooks": "^8.0.1", // ADD - for hook testing
    "msw": "^2.0.0",                        // ADD - for API mocking
    "vitest-mock-extended": "^1.3.1"       // ADD - for advanced mocking
  }
}
```

**You already have the test infrastructure! Just need to write tests.**

---

## Quick Wins - Start Here

### Week 1: Critical Business Logic (8 hours)

```javascript
// 1. src/utils/__tests__/rankUtils.test.js
describe('calculateAppropriateRank', () => {
  it('calculates Opal rank for new skiller', () => {
    const member = {
      womrole: 'Opal',
      current_xp: 5000000,
      first_xp: 3000000,
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Opal');
  });

  it('calculates Zenyte rank for max skiller', () => {
    const member = {
      womrole: 'Zenyte',
      current_xp: 600000000,
      first_xp: 0,
      ehb: 0
    };
    expect(calculateAppropriateRank(member)).toBe('Zenyte');
  });

  // Add 20+ more test cases...
});
```

### Week 2: Admin Functions (12 hours)

```javascript
// 2. netlify/edge-functions/__tests__/admin-update-member.test.js
describe('admin-update-member', () => {
  it('requires authentication', async () => {
    const request = new Request('http://localhost/api/admin/update-member', {
      method: 'POST',
      body: JSON.stringify({ womId: 123, updates: {} })
    });

    const response = await handler(request);
    expect(response.status).toBe(401);
  });

  it('validates JSON payload', async () => {
    const request = new Request('http://localhost/api/admin/update-member', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer valid-token' },
      body: 'invalid json'
    });

    const response = await handler(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Invalid JSON payload'
    });
  });

  // Add 10+ more test cases...
});
```

### Week 3: Sync Scripts (16 hours)

```javascript
// 3. scripts/sync-tasks/__tests__/sync-wom.test.js
describe('sync-wom', () => {
  it('handles WOM API errors gracefully', async () => {
    // Mock WOM API to return 500 error
    const result = await syncWom();
    expect(result).toHaveProperty('error');
    expect(result.stats.failed).toBeGreaterThan(0);
  });

  it('updates member data correctly', async () => {
    // Mock successful WOM response
    const result = await syncWom();
    expect(result.stats.updated).toBe(50);
    expect(result.stats.failed).toBe(0);
  });

  // Add 15+ more test cases...
});
```

---

## Metrics to Track

After implementing tests, track these metrics:

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| **Line Coverage** | ~3% | 80%+ | High |
| **Function Coverage** | <5% | 90%+ | High |
| **Branch Coverage** | <5% | 75%+ | Medium |
| **Critical Path Coverage** | 0% | 100% | **CRITICAL** |

**Critical Paths**:
- Admin operations (update, delete, toggle)
- Rank calculations (all 17 ranks)
- Sync scripts (all 4 scripts)
- Authentication (JWT validation)

---

## Test Automation

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test
```

### CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run Tests
  run: npm test -- --coverage

- name: Coverage Report
  run: npm run test:coverage

- name: Fail if coverage < 80%
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80%"
      exit 1
    fi
```

---

## Estimated Effort

| Priority | Tests to Write | Estimated Hours | Timeline |
|----------|----------------|-----------------|----------|
| **P0 - Critical** | ~80 tests | 40 hours | 1 week (full-time) or 2-3 weeks (evenings) |
| **P1 - High** | ~120 tests | 60 hours | 1.5 weeks (full-time) or 3-4 weeks (evenings) |
| **P2 - Medium** | ~150 tests | 75 hours | 2 weeks (full-time) or 5-6 weeks (evenings) |
| **P3 - Low** | ~100 tests | 50 hours | 1.5 weeks (full-time) or 4 weeks (evenings) |
| **TOTAL** | **~450 tests** | **225 hours** | **6-7 weeks full-time** or **4-5 months evenings** |

**Recommendation for unpaid side project**: Focus on P0 and P1 first (100 hours). Skip P3 entirely.

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ Review this document
2. ⬜ Install `@testing-library/react-hooks` and `msw`
3. ⬜ Write tests for `rankUtils.js` (8 hours)
4. ⬜ Write tests for admin edge functions (12 hours)
5. ⬜ Set up GitHub Actions test automation

### This Month

6. ⬜ Write tests for sync scripts (16 hours)
7. ⬜ Write tests for critical hooks (useMembers, useClaimRequests) (12 hours)
8. ⬜ Write tests for goalProgressService (8 hours)
9. ⬜ Set up coverage reporting
10. ⬜ Add pre-commit test hook

### Next Quarter

11. ⬜ Achieve 80% coverage on critical paths
12. ⬜ Write tests for remaining hooks
13. ⬜ Write tests for admin components
14. ⬜ Write tests for Netlify functions

---

## Resources

- **Testing Library Docs**: https://testing-library.com/docs/react-testing-library/intro/
- **Vitest Docs**: https://vitest.dev/
- **MSW (API Mocking)**: https://mswjs.io/
- **Testing React Hooks**: https://react-hooks-testing-library.com/

---

## Conclusion

The Siege Clan Tracker has **critical gaps in test coverage** that pose significant risk for an unpaid side project with no QA team. **Recommended action**:

1. **Start with P0 critical tests** (40 hours) - Rank calculations, admin functions, sync scripts
2. **Add P1 high-priority tests** (60 hours) - Hooks, components, services
3. **Skip P3 low-priority tests** - Focus effort where it matters
4. **Set up CI/CD automation** - Prevent regressions

**Total recommended investment**: **100 hours** to cover critical paths (P0 + P1).

This will provide a solid safety net for future changes without requiring a full-time QA team.

---

**Generated**: 2025-01-06
**Next Review**: After implementing P0 tests
**Owner**: Project Maintainer
