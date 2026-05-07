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
 * Verify no JavaScript errors occurred on the page
 * Collects console errors and page errors
 */
export async function expectNoJavaScriptErrors(page: Page) {
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

  // Give page time to fully render and execute
  await page.waitForTimeout(1000)

  // Filter out known harmless errors if needed
  const criticalErrors = errors.filter((error) => {
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
