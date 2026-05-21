import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors } from "../helpers/test-helpers"

/**
 * Authenticated Routes - OpenStack UI Smoke Tests
 *
 * These tests verify that authenticated OpenStack UIs load without errors.
 * Requires TEST_DOMAIN, TEST_USER, TEST_PASSWORD environment variables.
 *
 * Run with: pnpm test:e2e e2e/smoke/authenticated.spec.ts
 */
test.describe("Authenticated OpenStack UIs", () => {
  test("projects page loads without errors", async ({ page }) => {
    // loginAsTestUser sets up error tracking before navigation
    const errors = await loginAsTestUser(page)

    // Already on /projects from login
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Verify projects page content exists
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("projects list shows search functionality", async ({ page }) => {
    // loginAsTestUser sets up error tracking before navigation
    const errors = await loginAsTestUser(page)

    // Should already be on /projects from login
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Verify projects page loaded with search input
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible()
  })
})
