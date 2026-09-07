import { test, expect } from '@playwright/test';

/**
 * /progress and /profile were reachable only by typing the URL - the routes
 * existed but nothing linked to them, so the features were invisible even when
 * they worked. These assert the links are actually present, and that the pages
 * behind them render rather than throwing.
 *
 * The negative assertion on Profile matters as much as the positive ones: the
 * auth links are conditional, so a bug that renders them for everyone would
 * otherwise pass unnoticed.
 */

async function rendersWithoutErrors(page, path) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(path);
  await expect(page.locator('#root')).not.toBeEmpty();
  expect(errors).toEqual([]);
}

test.describe('navigation for a logged-out visitor', () => {
  test('navbar offers Login and Register', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('navbar does not show Profile or Logout when logged out', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Profile' })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Logout' })).toHaveCount(0);
  });

  // Deliberately no Goals link: /progress crashes because ProgressPage reads
  // race.public, activeRaces and goal.public, none of which exist in the
  // schema. Linking it would just expose a white screen.
  test('does not link to the unfinished progress page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').getByRole('link', { name: 'Goals' })).toHaveCount(0);
  });
});

test.describe('a registered member', () => {
  /**
   * Registers through the real form, which also proves the users INSERT policy
   * works end to end.
   *
   * The Admin assertion is the important one. AuthContext exports isAdmin and
   * isLoggedIn as functions, and the navbar originally wrote `{isAdmin && ...}`
   * and `{isLoggedIn ? ...}` - a function reference is always truthy, so every
   * visitor saw an Admin link and no visitor saw Login. Both are easy to
   * reintroduce and invisible without a logged-in test.
   */
  test('lands on a working profile and sees no Admin link', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const username = `smokemate${Date.now()}`;
    await page.goto('/register');
    await page.locator('input[type="text"], input:not([type])').first().fill(username);
    const passwords = page.locator('input[type="password"]');
    const count = await passwords.count();
    for (let i = 0; i < count; i++) await passwords.nth(i).fill('smoke-password-not-a-secret');
    await page.locator('button[type="submit"]').first().click();

    // Registration redirects to the profile, which used to be a blank page:
    // ProfilePage read userClaims from useClaimRequests(), which never returned
    // that key, so `userClaims.length` threw before the first paint.
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15_000 });
    await expect(page.getByText('Your Characters')).toBeVisible();
    expect(errors).toEqual([]);

    const nav = page.locator('nav');
    await expect(nav.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Login' })).toHaveCount(0);
  });

  /**
   * Only the claim-code path in ClaimPlayer is finished. The other two tabs
   * are gated behind ?preview so they can be exercised in production without
   * members seeing them. Worth a test because JSX children are evaluated even
   * for inactive tabs, so an unfinished tab left mounted takes the whole
   * Requests view down before it paints - which is exactly what happened.
   */
  test('the Requests tab shows only the finished claim-code path', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const username = `smoketab${Date.now()}`;
    await page.goto('/register');
    await page.locator('input[type="text"], input:not([type])').first().fill(username);
    const passwords = page.locator('input[type="password"]');
    const count = await passwords.count();
    for (let i = 0; i < count; i++) await passwords.nth(i).fill('smoke-password-not-a-secret');
    await page.locator('button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/profile$/, { timeout: 15_000 });

    await page.getByText('Requests', { exact: true }).first().click();
    await expect(page.getByText('Use a Claim Code')).toBeVisible();
    await expect(page.getByText('Search Members')).toHaveCount(0);
    await expect(page.getByText('View My Requests')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('previously unreachable pages render', () => {
  test('profile page renders', async ({ page }) => rendersWithoutErrors(page, '/profile'));
  test('register page renders', async ({ page }) => rendersWithoutErrors(page, '/register'));
  test('login page renders', async ({ page }) => rendersWithoutErrors(page, '/login'));
});
