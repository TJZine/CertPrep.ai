import { defineConfig, devices } from "@playwright/test";

/**
 * Production-like browser checks.
 *
 * Unlike the mock-friendly authenticated harness, this configuration keeps
 * browser security enabled and allows service workers so PWA behavior is real.
 */
export default defineConfig({
  testDir: "./tests/e2e-production",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    serviceWorkers: "allow",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-production-like",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
});
