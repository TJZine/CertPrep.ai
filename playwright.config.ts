import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for CertPrep.ai E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./tests/e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI ? "github" : "html",

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: "http://localhost:3000",

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Block service workers to prevent interference with network mocking
    serviceWorkers: "block",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Use saved auth state
    storageState: "tests/e2e/.auth/user.json",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Required for Playwright runs: production CSP removes 'unsafe-inline' for styles and relies on nonces;
          // the test server doesn't propagate the nonce header the same way, so inline styles trigger CSP blocks.
          // Disabling web security here avoids false negatives in E2E without affecting production CSP.
          args: ["--disable-web-security"],
        },
      },
    },
    // Can add more browsers later:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js to start
    env: {
      // Disable captcha for E2E tests
      NEXT_PUBLIC_HCAPTCHA_SITE_KEY: "",
    },
  },

  // Global setup to create test user and save auth state
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),

  // Global timeout for each test
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
  },
});
