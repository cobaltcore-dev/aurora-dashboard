import { test, expect } from "@playwright/test"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Projects Overview Page Tests
 *
 * Tests the main projects overview page functionality including:
 * - Project listing
 * - Search functionality
 * - Project visibility
 * Authentication state is provided by global setup (storageState.json).
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/projects-overview.spec.ts
 */
test.describe("Projects Overview Page", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  test("can search and find test project", async ({ page }) => {
    // Set up error tracking and navigate
    const errors = setupErrorTracking(page)
    await page.goto("/projects")
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Get the search input
    const searchInput = page.locator('input[placeholder="Search..."]')
    await expect(searchInput).toBeVisible()

    // Search for test project
    await searchInput.fill(testProject)

    // Wait a bit for search results to filter
    await page.waitForTimeout(500)

    // Verify the test project is visible in results
    const projectHeading = page.locator('[data-testid="project-name"]', { hasText: testProject })
    await expect(projectHeading).toBeVisible()
  })

  test("test project appears in initial project list", async ({ page }) => {
    // Set up error tracking and navigate
    const errors = setupErrorTracking(page)
    await page.goto("/projects")
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Without searching, verify test project is in the list
    const projectHeading = page.locator('[data-testid="project-name"]', { hasText: testProject })

    // Should be visible (might need to scroll)
    await expect(projectHeading).toBeVisible({ timeout: 5000 })
  })
})
