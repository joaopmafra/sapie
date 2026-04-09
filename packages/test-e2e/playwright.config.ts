import { defineConfig, devices } from '@playwright/test';

/** Functions emulator URL for Nest `/api/health` (function name `api`). Project id is `demo-test-e2e` (alias `test-e2e` in .firebaserc). */
const E2E_READINESS_URL =
  'http://127.0.0.1:5001/demo-test-e2e/us-central1/api/api/health';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'line', // line or html
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // disabled for now
    /*{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Test against mobile viewports.
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },*/

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /**
   * Emulators run in Docker (`compose.test-e2e.yml`), not via `firebase` on the host.
   * If the health URL already responds, reuse it. Otherwise `scripts/wait-emulator-ready.sh` polls, then idles for Playwright teardown.
   */
  webServer: {
    command: 'bash scripts/wait-emulator-ready.sh',
    url: E2E_READINESS_URL,
    reuseExistingServer: true,
    timeout: 200_000,
    env: { E2E_READINESS_URL },
  },
});
