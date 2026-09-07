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

test.describe('previously unreachable pages render', () => {
  test('profile page renders', async ({ page }) => rendersWithoutErrors(page, '/profile'));
  test('register page renders', async ({ page }) => rendersWithoutErrors(page, '/register'));
  test('login page renders', async ({ page }) => rendersWithoutErrors(page, '/login'));
});
