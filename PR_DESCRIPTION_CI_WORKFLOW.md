# ci: Add automated test workflow for pull requests

## Summary

This PR adds a comprehensive CI workflow that automatically runs tests on all pull requests and pushes to main. This ensures code quality and prevents breaking changes from being merged.

**Context:** With 410+ tests now in the codebase (and growing), manual test execution is error-prone. Automated CI catches issues before merge and provides immediate feedback.

## What's Changed

### New GitHub Actions Workflow

#### `.github/workflows/ci.yml`

**Two Jobs:**

1. **Test Job** - Runs on every PR and push to main
   - ✅ Checks out code
   - ✅ Sets up Node.js 18 with npm caching
   - ✅ Installs dependencies (`npm ci`)
   - ✅ Runs all tests (`npm test`)
   - ✅ Runs build (`npm run build`)
   - ✅ Reports status on PR

2. **Lint Job** - Code quality checks
   - ✅ Checks out code
   - ✅ Sets up Node.js 18 with npm caching
   - ✅ Installs dependencies (`npm ci`)
   - ✅ Runs linting if configured (`npm run lint --if-present`)
   - ⚠️ Continues on error (won't block PRs)

**Triggers:**
- All pull requests (regardless of target branch)
- Pushes to `main` branch

**Optimization:**
- Uses `cache: 'npm'` for faster runs
- Uses latest stable actions (checkout@v5, setup-node@v6)
- Uses `npm ci` for deterministic installs

## Why This Change?

### Current Test Coverage
- **410+ test cases** across multiple files:
  - Unit tests: rankUtils, stringUtils, seasonalIcons (210+ tests)
  - Service tests: goalProgressService (200+ tests)
  - Component tests: AdminUserManager, Button, GoalCard, etc. (from recently merged PR)
  - Page tests: MembersPage, ProfilePage, LeaderboardPage, etc.

### Problem Without CI
- ❌ Tests must be run manually before every merge
- ❌ Easy to forget to run tests locally
- ❌ No guarantee tests pass before merge
- ❌ Broken code can reach main
- ❌ No visibility into test status on PRs

### Solution With CI
- ✅ Tests run automatically on every PR
- ✅ Immediate feedback (within ~2-3 minutes)
- ✅ Status checks appear directly on PR
- ✅ Can require passing tests before merge (via branch protection)
- ✅ Prevents broken builds from reaching main
- ✅ Contributors see test failures before requesting review

## How It Works

### When You Create a PR:
1. CI workflow triggers automatically
2. GitHub Actions spins up Ubuntu runner
3. Checks out your PR branch
4. Installs Node.js 18 and dependencies
5. Runs `npm test` (all 410+ tests)
6. Runs `npm run build` (catches compilation errors)
7. Reports status on PR (✅ or ❌)

### On PR Page:
```
✅ CI Tests / Run Tests
✅ CI Tests / Code Quality
```

Or if tests fail:
```
❌ CI Tests / Run Tests - Details
✅ CI Tests / Code Quality
```

## Example Workflow Run

**Successful run:**
```
✓ Checkout code
✓ Setup Node.js (18, cache hit)
✓ Install dependencies (12s)
✓ Run tests (45s, 410/410 passed)
✓ Build project (20s)
Total: ~1m 30s
```

**Failed run:**
```
✓ Checkout code
✓ Setup Node.js (18, cache hit)
✓ Install dependencies (12s)
✗ Run tests (15s, 408/410 passed, 2 failed)
  FAIL src/utils/__tests__/rankUtils.test.js
    ● calculateAppropriateRank › returns correct rank for Zenyte
Total: ~30s
```

## Optional: Branch Protection

After merging this PR, you can optionally enable branch protection on `main`:

1. Go to Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Enable: "Require status checks to pass before merging"
4. Select: "CI Tests / Run Tests"
5. Enable: "Require branches to be up to date before merging"

This will **prevent merging any PR with failing tests**.

## Performance

**First run (no cache):**
- ~2-3 minutes total

**Subsequent runs (with cache):**
- ~1.5-2 minutes total

**Cost:**
- Free for public repos
- Uses GitHub Actions minutes (2,000 free/month for private repos)

## What's NOT Changed

- No changes to existing tests
- No changes to test configuration
- No changes to package.json scripts
- No changes to existing workflows

## Related

- Complements PR #1 (unit tests without code changes)
- Complements PR #2 (tests with refactoring)
- Complements recently merged PR with component/page tests
- Part of test coverage improvement initiative

## Checklist

- [x] Workflow triggers on all PRs
- [x] Workflow triggers on pushes to main
- [x] Uses latest stable actions (v5, v6)
- [x] Uses npm caching for performance
- [x] Runs all tests
- [x] Runs build to catch compilation errors
- [x] Includes code quality checks (linting)
- [x] Proper error handling
- [x] Clear job names

## How to Review

1. **Review workflow file:** `.github/workflows/ci.yml`
2. **Verify triggers:** Should run on PRs and main pushes
3. **Check steps:** Install → Test → Build
4. **Validate performance:** Uses npm cache, latest actions
5. **Test it:** Merge this PR and create a test PR to see it in action

## Testing This PR

Once this PR is created, the CI workflow will run on itself! You'll see:
- ✅ CI Tests / Run Tests
- ✅ CI Tests / Code Quality

This validates that the workflow works correctly.

## Future Enhancements

Possible future improvements (not in this PR):
- Add test coverage reporting
- Add multiple Node.js versions (18, 20)
- Add deployment previews for PRs
- Add security scanning
- Add performance benchmarks

## Branch

Branch: `claude/add-ci-workflow-pr-011CUpSX1HVT7YG2BzcsJH5C`

Create PR at: https://github.com/atayl16/siege-clan-tracker/pull/new/claude/add-ci-workflow-pr-011CUpSX1HVT7YG2BzcsJH5C
