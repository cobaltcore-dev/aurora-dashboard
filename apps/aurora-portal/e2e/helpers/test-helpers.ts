import { expect, Page } from "@playwright/test"

/**
 * Test helper utilities for Aurora Portal E2E tests
 */

/**
 * Wait for the page to load completely
 */
export async function expectPageLoaded(page: Page, options?: { timeout?: number }) {
  await page.waitForLoadState("networkidle", { timeout: options?.timeout })
  await page.waitForLoadState("domcontentloaded")
}

/**
 * Set up error tracking for a page before navigation
 * Returns an array that will collect errors during page execution
 *
 * IMPORTANT: Call this BEFORE navigation to capture errors during page load
 *
 * @example
 * const errors = setupErrorTracking(page)
 * await page.goto('/some-page')
 * await expectPageLoaded(page)
 * await expectNoJavaScriptErrors(errors, page)
 */
export function setupErrorTracking(page: Page): string[] {
  const errors: string[] = []

  // Collect console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`Console error: ${msg.text()}`)
    }
  })

  // Collect page errors (uncaught exceptions)
  page.on("pageerror", (error) => {
    errors.push(`Page error: ${error.message}`)
  })

  return errors
}

/**
 * Verify no JavaScript errors occurred on the page
 *
 * @param errors - Array returned by setupErrorTracking()
 * @param page - Page instance for waiting
 *
 * @example
 * const errors = setupErrorTracking(page)
 * await page.goto('/some-page')
 * await expectPageLoaded(page)
 * await expectNoJavaScriptErrors(errors, page)
 */
export async function expectNoJavaScriptErrors(errors: string[], page: Page) {
  // Give page time to fully render and execute
  await page.waitForTimeout(1000)

  // Filter out known harmless errors, but only in development mode
  // In production, we want to catch all errors
  const isDevelopment = process.env.NODE_ENV !== "production"
  const criticalErrors = isDevelopment
    ? errors.filter((error) => {
        // Example: ignore ResizeObserver errors (common in many apps)
        if (error.includes("ResizeObserver")) return false
        // Ignore React development warnings about setState during render
        // These are warnings, not critical errors that break functionality
        if (error.includes("Cannot update a component") && error.includes("while rendering")) return false
        // Ignore React warnings about nested buttons (Juno UI component issue)
        // These are HTML validation warnings but don't break functionality
        if (error.includes("cannot be a descendant of") || error.includes("cannot contain a nested")) return false
        return true
      })
    : errors // In production, report all errors without filtering

  expect(criticalErrors, `Expected no JavaScript errors, but found: ${criticalErrors.join(", ")}`).toEqual([])
}

/**
 * Check if an element exists and is visible on the page
 */
export async function expectElementVisible(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout })
}

/**
 * Check page title contains expected text
 */
export async function expectPageTitle(page: Page, expectedTitle: string) {
  await expect(page).toHaveTitle(new RegExp(expectedTitle, "i"))
}
