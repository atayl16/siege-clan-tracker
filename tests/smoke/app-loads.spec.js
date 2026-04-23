import { test, expect } from '@playwright/test';

// Smoke tests: confirm the app renders against a local Supabase stack seeded via supabase/seed.sql.
// Public pages only — admin smoke tests deferred until auth harness exists.
// Seed contract: 15 members, 1 hidden, 1 with left_date set → 13 visible on public.

async function renders(page, path) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(path);
  await expect(page.locator('#root')).not.toBeEmpty();
  expect(errors).toEqual([]);
}

test.describe('public pages load', () => {
  test('home page renders',        async ({ page }) => renders(page, '/'));
  test('events page renders',      async ({ page }) => renders(page, '/events'));
  test('leaderboard page renders', async ({ page }) => renders(page, '/leaderboard'));
});

test.describe('members page', () => {
  test('shows exactly 13 visible seeded members', async ({ page }) => {
    await page.goto('/members');
    const nameCells = page.locator('.ui-member-name');
    await expect(nameCells).toHaveCount(13, { timeout: 10_000 });
  });

  test('shows a representative skiller (Diamond), fighter (TzKal), and admin (Owner)', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByText('Smoke Diamond', { exact: true })).toBeVisible();
    await expect(page.getByText('Smoke TzKal', { exact: true })).toBeVisible();
    await expect(page.getByText('Smoke Owner', { exact: true })).toBeVisible();
  });

  test('hides the hidden member and the left member', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByText('Smoke Hidden', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Smoke LeftMember', { exact: true })).toHaveCount(0);
  });

  test('renders deputy_owner as "Deputy Owner" (titleize fix)', async ({ page }) => {
    // AdminIcon sets `title="Deputy Owner"` on the icon. The raw DB value is "deputy_owner".
    // If the titleize regression returns, the title would be "Deputy_owner" — the negative
    // assertion is what actually guards the regression.
    await page.goto('/members');
    await expect(page.locator('[title="Deputy Owner"]').first()).toBeVisible();
    await expect(page.locator('[title="Deputy_owner"]')).toHaveCount(0);
  });

  test('search filter narrows results to one member', async ({ page }) => {
    await page.goto('/members');
    await page.getByPlaceholder('Search members...').fill('Zenyte');
    // Wait for the filter to settle: row count collapses to 1.
    await expect(page.locator('.ui-member-name')).toHaveCount(1);
    await expect(page.getByText('Smoke Zenyte', { exact: true })).toBeVisible();
  });
});
