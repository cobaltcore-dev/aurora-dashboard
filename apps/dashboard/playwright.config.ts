import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"

dotenv.config()

/**
 * Playwright configuration for Aurora Portal E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry (3x) on CI and locally (1x) for flaky tests */
  retries: process.env.CI ? 3 : 1,

  /* Limit workers to 2 to avoid overwhelming backend with parallel requests and rate limiting */
  workers: 2,

  /* Global setup to login once and reuse session across tests */
  globalSetup: "./e2e/global-setup.ts",

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { open: "never" }], ["list"], ["junit", { outputFile: "e2e/playwright-results/results.xml" }]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || "http://localhost:3000",

    /* Reuse authentication state from global setup */
    storageState: "e2e/playwright-results/storageState.json",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshots on failure only */
    screenshot: "only-on-failure",

    /* Video on failure only */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    // Project for testing unauthenticated flows (login, about page, etc.)
    // Does NOT use storageState so tests start logged out
    // Must come FIRST to avoid inheriting storageState from the default use config
    {
      name: "chromium-unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] }, // Explicitly clear storage state
      },
      testMatch: /.*unauthenticated\.spec\.ts/, // Only run unauthenticated tests
    },

    // Default project for authenticated tests
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /.*unauthenticated\.spec\.ts/, // Skip unauthenticated tests
    },

    // Uncomment for multi-browser testing
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    //
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: "e2e/playwright-results",
})
