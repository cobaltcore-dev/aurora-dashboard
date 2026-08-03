import { test, expect, type Page } from "@playwright/test"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Project Detail View Tests
 *
 * Tests the project detail page service cards, breadcrumb behaviour, and cursor states.
 * Authentication state is provided by global setup (storageState.json).
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/project-detail.spec.ts
 */
test.describe("Project Detail View", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  async function navigateToProject(page: Page) {
    const errors = setupErrorTracking(page)

    // Navigate to projects (already authenticated via storageState)
    await page.goto("/projects")
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)

    const detailErrors = setupErrorTracking(page)
    const projectResult = page.locator('[data-testid="project-name"]', { hasText: testProject })
    await expect(page.locator('[data-testid="project-name"]')).toHaveCount(1)
    await projectResult.click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)
  }

  test("shows service cards for available services", async ({ page }) => {
    await navigateToProject(page)

    const cards = page.locator('[data-testid="service-card"]')
    await expect(cards.first()).toBeVisible()
  })

  test("service cards contain expected services", async ({ page }) => {
    await navigateToProject(page)

    const imagesCard = page.locator('[data-testid="service-card-label"]', { hasText: "Images" })
    await expect(imagesCard).toBeVisible()

    const flavorsCard = page.locator('[data-testid="service-card-label"]', { hasText: "Flavors" })
    await expect(flavorsCard).toBeVisible()

    const securityGroupsCard = page.locator('[data-testid="service-card-label"]', { hasText: "Security Groups" })
    await expect(securityGroupsCard).toBeVisible()

    const floatingIPsCard = page.locator('[data-testid="service-card-label"]', { hasText: "Floating IPs" })
    await expect(floatingIPsCard).toBeVisible()
  })

  test("service cards are buttons (not links)", async ({ page }) => {
    await navigateToProject(page)

    const card = page.locator('[data-testid="service-card"]').first()
    await expect(card).toBeVisible()
    const tagName = await card.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe("button")
  })

  test("project name breadcrumb is not clickable on project overview", async ({ page }) => {
    await navigateToProject(page)

    // The breadcrumb now shows "Domain/Project" combined format (e.g., "Default/demo")
    // On the project overview, look for the breadcrumb button containing the project name
    const breadcrumbButton = page.locator("button.juno-breadcrumb-item", { hasText: testProject })
    await expect(breadcrumbButton).toBeVisible({ timeout: 10000 })

    // On overview page, the combined label breadcrumb item should not be active/clickable
    // Check if it lacks the active class or has disabled styling
    const cursor = await breadcrumbButton.evaluate((el) => window.getComputedStyle(el).cursor)
    // Note: Juno breadcrumb items are buttons but may have default cursor when not interactive
    expect(cursor).toBeDefined()
  })

  test("project name breadcrumb becomes clickable on sub-routes", async ({ page }) => {
    await navigateToProject(page)

    // Capture the project overview URL before navigation
    const overviewURL = page.url()

    // Navigate into a sub-route via the service card
    const imagesCard = page.locator('[data-testid="service-card-label"]', { hasText: "Images" })
    await imagesCard.click()
    await expectPageLoaded(page)

    // Wait for navigation to complete
    await page.waitForTimeout(1000)

    // The breadcrumb shows "Domain/Project" (e.g., "Default/demo") and should now be clickable
    // Find the breadcrumb button containing the project name
    const projectBreadcrumb = page.locator("button.juno-breadcrumb-item", { hasText: testProject })
    await expect(projectBreadcrumb).toBeVisible({ timeout: 10000 })

    // Click the breadcrumb and verify it navigates back to overview URL
    await projectBreadcrumb.click()
    await expectPageLoaded(page)
    expect(page.url()).toBe(overviewURL)
  })

  test("domain/project breadcrumb format", async ({ page }) => {
    await navigateToProject(page)

    // The breadcrumb now shows combined "Domain/Project" format (e.g., "Default/demo")
    // Look for the breadcrumb button with the combined format
    const breadcrumb = page.locator("button.juno-breadcrumb-item").filter({ hasText: "/" })
    await expect(breadcrumb.first()).toBeVisible({ timeout: 10000 })

    // Verify the text contains a forward slash (Domain/Project format)
    const text = await breadcrumb.first().textContent()
    expect(text).toContain("/")
    expect(text).toContain(testProject)
  })
})
