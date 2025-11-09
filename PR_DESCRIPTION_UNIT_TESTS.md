# test: Add comprehensive unit tests for utility functions (Part 1)

## Summary

This PR adds comprehensive unit test coverage for utility functions that do not require any changes to production code. This is Part 1 of a two-part effort to improve test coverage for the application.

**Context:** This is an unpaid side project with no QA team, so excellent test coverage is critical for maintaining quality and catching regressions early.

## What's Changed

### New Test Files

#### 1. `src/utils/__tests__/rankUtils.test.js` (100+ tests)
Comprehensive test coverage for rank calculation utilities:

- **Rank Constants Validation**
  - Validates all 8 skiller ranks (Opal → Zenyte)
  - Validates all 9 fighter ranks (Mentor → TzKal)
  - Ensures rank arrays are properly ordered and complete

- **Helper Functions**
  - `safeFormat()`: Number formatting with null/undefined handling
  - `safeParseInt()`: Safe integer parsing with type coercion

- **Rank Calculation Logic**
  - `calculateAppropriateRank()`: Tests for all 17 ranks
  - Boundary condition testing (exact XP/EHB thresholds)
  - Edge cases (null values, string types, missing fields)
  - Case sensitivity in role name matching

- **Rank Progression**
  - `calculateNextLevel()`: XP/EHB needed to reach next rank
  - Handles max rank scenarios (returns 0)
  - Works for both skiller and fighter progression paths

- **Rank Update Detection**
  - `memberNeedsRankUpdate()`: Detects when member ranks are outdated
  - Tests hidden member exclusions
  - Validates role matching logic

#### 2. `src/utils/__tests__/stringUtils.test.js` (70+ tests)
Comprehensive test coverage for string utilities:

- **Basic Functionality**
  - Capitalizes first letter of each word
  - Handles mixed case, uppercase, lowercase inputs
  - Preserves multiple spaces between words

- **Null/Empty Handling**
  - Returns "-" for null, undefined, empty strings
  - Handles whitespace-only strings

- **Special Characters & Edge Cases**
  - Numbers, hyphens, underscores, apostrophes
  - Leading/trailing/mixed spacing
  - Very long strings, tabs, newlines

- **Real-World Usage**
  - Tests all RuneScape rank names (Opal, Sapphire, etc.)
  - Handles uppercase rank names from database
  - Multi-word rank names (Iron Man, Ultimate Ironman)

- **Type Coercion**
  - Falsy values (0, false, NaN)
  - Empty arrays, objects

#### 3. `src/utils/__tests__/seasonalIcons.test.js` (40+ tests)
Comprehensive test coverage for seasonal icon selection:

- **All Months Coverage**
  - Tests all 12 months of the year
  - Validates October returns Halloween pumpkin icon
  - Validates December returns Christmas/holiday hat icon
  - Validates non-seasonal months return default favicon

- **Icon Path Format**
  - Tests path format consistency (/icons/*.png or *.ico)
  - Validates all paths start with /icons/
  - Validates all paths end with .png or .ico

- **Boundary Conditions**
  - Tests first/last month of year (January/December)
  - Tests months before/after seasonal periods

- **Function Consistency**
  - Same input returns same output
  - Multiple calls in same month return identical results

- **Date Mocking**
  - Uses vitest date mocking to test time-dependent behavior
  - No production code changes required
  - Pure unit tests with full control over date state

## Why These Tests?

These utilities are **critical path code**:

1. **rankUtils.js** (206 lines)
   - Handles 17 different rank calculations
   - Wrong calculations directly impact user experience
   - Complex business logic with multiple edge cases
   - Identified as **P0 (Critical)** priority in test coverage analysis

2. **stringUtils.js** (10 lines)
   - Used throughout the app for display formatting
   - Simple function but needs null safety guarantees
   - Identified as **P1 (High)** priority in test coverage analysis

3. **seasonalIcons.js** (37 lines)
   - Controls user-facing branding (seasonal favicons)
   - Time-dependent behavior needs validation
   - Identified as **P1 (High)** priority in test coverage analysis

## Test Execution

These tests are written for vitest and will run via:
```bash
npm test
```

**Note:** Tests are ready to run once vitest environment is properly configured. They do not modify any production code.

## What's NOT in This PR

This PR intentionally does NOT include:
- Tests requiring code refactoring (coming in Part 2)
- Integration tests
- Component tests requiring @testing-library/react
- Tests for sync scripts or hooks

## Test Coverage Impact

**Before:** 3.5% test coverage (3 test files out of 86 source files)
**After:** Adds 3 critical utility test files with 210+ test cases

- rankUtils.test.js: 100+ tests
- stringUtils.test.js: 70+ tests
- seasonalIcons.test.js: 40+ tests

## Related

- Part of test coverage improvement initiative
- Follows analysis documented in `TEST_COVERAGE_ANALYSIS.md` (PR #43)
- Part 2 will add tests that require code changes for testability

## Checklist

- [x] Tests written for all exported functions
- [x] Edge cases and boundary conditions covered
- [x] No changes to production code required
- [x] Tests follow vitest conventions
- [x] Clear test descriptions and organization
- [x] Real-world usage scenarios included

## How to Review

1. Review test coverage for `rankUtils.js` (src/utils/rankUtils.js:1-206)
2. Review test coverage for `stringUtils.js` (src/utils/stringUtils.js:1-10)
3. Review test coverage for `seasonalIcons.js` (src/utils/seasonalIcons.js:1-37)
4. Verify all edge cases are handled
5. Check that tests are clear and maintainable
6. Confirm no production code changes are required
7. Validate date mocking approach in seasonalIcons.test.js

## Branch

Branch: `claude/add-unit-tests-pr-011CUpSX1HVT7YG2BzcsJH5C`

Create PR at: https://github.com/atayl16/siege-clan-tracker/pull/new/claude/add-unit-tests-pr-011CUpSX1HVT7YG2BzcsJH5C
