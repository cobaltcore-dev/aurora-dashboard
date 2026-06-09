import { test, expect } from "@playwright/test"
import {
  expectPageLoaded,
  expectNoJavaScriptErrors,
  expectElementVisible,
  setupErrorTracking,
} from "../helpers/test-helpers"

/**
 * Unauthenticated Routes - Smoke Tests
 *
 * These tests verify that public routes load without errors.
 * No authentication is required.
 *
 * Run with: pnpm test:e2e e2e/smoke/unauthenticated.spec.ts
 */
test.describe("Unauthenticated Routes", () => {
  test("login page loads without errors", async ({ page }) => {
    // Set up error tracking BEFORE navigation
    const errors = setupErrorTracking(page)

    // Navigate to login page
    await page.goto("/")

    // Wait for page to load
    await expectPageLoaded(page)

    // Verify no JavaScript errors
    await expectNoJavaScriptErrors(errors, page)

    // Verify login form elements are present
    await expectElementVisible(page, "input#domain")
    await expectElementVisible(page, "input#user")
    await expectElementVisible(page, "input#password")
    await expectElementVisible(page, 'button:has-text("Sign In")')
  })

  test("about page loads without errors", async ({ page }) => {
    // Set up error tracking BEFORE navigation
    const errors = setupErrorTracking(page)

    // Navigate to about page
    await page.goto("/about")

    // Wait for page to load
    await expectPageLoaded(page)

    // Verify no JavaScript errors
    await expectNoJavaScriptErrors(errors, page)

    // Verify page has content
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("protected route redirects to login", async ({ page }) => {
    // Try to access accounts page (protected route)
    await page.goto("/accounts")

    // Should redirect to login
    await page.waitForURL("**/?redirect=**", { timeout: 10000 })

    // Verify we're on login page by checking form elements
    await expectElementVisible(page, "input#domain")
    await expectElementVisible(page, "input#user")
    await expectElementVisible(page, "input#password")
  })
})
