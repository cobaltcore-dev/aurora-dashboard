import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"

// Load .env file for local development
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

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"], ["junit", { outputFile: "e2e/test-results/results.xml" }]]
    : [["html", { open: "never" }], ["list"]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${process.env.PORT || "4500"}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshots on failure only */
    screenshot: "only-on-failure",

    /* Video on failure only */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
  outputDir: "e2e/test-results",
})
