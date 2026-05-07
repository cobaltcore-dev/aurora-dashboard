import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors } from "../helpers/test-helpers"

/**
 * Projects Overview Page Tests
 *
 * Tests the main projects overview page functionality including:
 * - Project listing
 * - Search functionality
 * - Project visibility
 *
 * Run with: pnpm test:e2e e2e/ui/projects-overview.spec.ts
 */
test.describe("Projects Overview Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login and land on projects overview
    await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)
  })

  test("can search and find demo project", async ({ page }) => {
    // Get the search input
    const searchInput = page.locator('input[placeholder="Search..."]')
    await expect(searchInput).toBeVisible()

    // Search for "demo" project
    await searchInput.fill("demo")

    // Wait a bit for search results to filter
    await page.waitForTimeout(500)

    // Verify the demo project is visible in results
    const demoProjectHeading = page.locator('h1.juno-content-heading', { hasText: "demo" })
    await expect(demoProjectHeading).toBeVisible()

    // Verify the heading has the correct styling classes
    await expect(demoProjectHeading).toHaveClass(/text-theme-accent/)
  })

  test("demo project appears in initial project list", async ({ page }) => {
    // Without searching, verify demo project is in the list
    const demoProjectHeading = page.locator('h1.juno-content-heading', { hasText: "demo" })

    // Should be visible (might need to scroll)
    await expect(demoProjectHeading).toBeVisible({ timeout: 5000 })
  })
})
