import { test, expect } from "@playwright/test"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Authenticated Routes - OpenStack UI Smoke Tests
 *
 * These tests verify that authenticated OpenStack UIs load without errors.
 * Authentication state is provided by global setup (storageState.json).
 *
 * Run with: pnpm test:e2e e2e/smoke/authenticated.spec.ts
 */
test.describe("Authenticated OpenStack UIs", () => {
  test("projects page loads without errors", async ({ page }) => {
    // Set up error tracking
    const errors = setupErrorTracking(page)

    // Navigate to projects (already authenticated via storageState)
    await page.goto("/projects")

    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Verify projects page content exists
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("projects list shows search functionality", async ({ page }) => {
    // Set up error tracking
    const errors = setupErrorTracking(page)

    // Navigate to projects (already authenticated via storageState)
    await page.goto("/projects")

    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Verify projects page loaded with search input
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible()
  })
})
