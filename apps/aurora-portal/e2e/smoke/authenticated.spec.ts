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
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page)
  })

  test("accounts page loads without errors", async ({ page }) => {
    // Already on /accounts/** from login
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify accounts page content exists
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("projects list loads without errors", async ({ page }) => {
    // Extract account ID from current URL
    const currentUrl = page.url()
    const accountIdMatch = currentUrl.match(/\/accounts\/([^/]+)/)

    if (!accountIdMatch) {
      throw new Error("Could not extract account ID from URL")
    }

    const accountId = accountIdMatch[1]

    // Navigate to projects list
    await page.goto(`/accounts/${accountId}/projects`)

    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify projects page loaded with search input
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible()
  })
})
