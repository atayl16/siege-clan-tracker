import { defineConfig, devices } from '@playwright/test';

// Smoke-test config. Runs Vite dev server against the local Supabase stack.
// `.env.test` is generated at run time by `npm run test:smoke` from
// `supabase status -o env` — it is gitignored and never committed.

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:8889',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Vite's --mode test causes it to load .env.test
    command: 'npx vite --mode test --port 8889 --host 127.0.0.1',
    url: 'http://localhost:8889',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
