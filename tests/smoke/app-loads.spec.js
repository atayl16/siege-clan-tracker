import { test, expect } from '@playwright/test';

// Smoke tests: confirm the app renders against a local Supabase stack seeded via supabase/seed.sql.
// Public pages only — admin smoke tests deferred until auth harness exists.
// Seed contract: 15 members, 1 hidden, 1 with left_date set → 13 visible on public.

test.describe('public pages load', () => {
  test('home page renders', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    // App mounts something under #root
    await expect(page.locator('#root')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('events page renders', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('leaderboard page renders', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});

test.describe('members page', () => {
  test('shows exactly 13 visible seeded members', async ({ page }) => {
    await page.goto('/members');
    // The MemberTable renders each name in a span.ui-member-name.
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
    // If the titleize regression returns, the title would be "Deputy_owner" and this fails.
    await page.goto('/members');
    await expect(page.locator('[title="Deputy Owner"]')).toHaveCount(1);
    await expect(page.locator('[title="Deputy_owner"]')).toHaveCount(0);
  });

  test('search filter narrows results to one member', async ({ page }) => {
    await page.goto('/members');
    // Find the search input (SearchInput component).
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Zenyte');
    await expect(page.getByText('Smoke Zenyte', { exact: true })).toBeVisible();
    // Other seeded members no longer visible.
    await expect(page.getByText('Smoke Diamond', { exact: true })).toHaveCount(0);
  });
});
