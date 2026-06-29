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

    // The active breadcrumb item should be a span, not a button or anchor
    const breadcrumbItem = page.locator(".juno-breadcrumb-item-active")
    await expect(breadcrumbItem).toBeVisible()
    const tagName = await breadcrumbItem.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe("span")

    // Cursor should not be pointer
    const cursor = await breadcrumbItem.evaluate((el) => window.getComputedStyle(el).cursor)
    expect(cursor).not.toBe("pointer")
  })

  test("project name breadcrumb becomes clickable on sub-routes", async ({ page }) => {
    await navigateToProject(page)

    // Navigate into a sub-route via the side nav
    const imagesCard = page.locator('[data-testid="service-card-label"]', { hasText: "Images" })
    await imagesCard.click()
    await expectPageLoaded(page)

    // Wait for navigation to complete
    await page.waitForTimeout(1000)

    // The breadcrumb structure uses links, not buttons
    // Find the clickable "demo" breadcrumb link
    const projectBreadcrumbLink = page.locator(`a:has-text("${testProject}")`)

    // Verify it's visible and clickable
    await expect(projectBreadcrumbLink).toBeVisible({ timeout: 10000 })

    // Verify it's actually a link element
    const tagName = await projectBreadcrumbLink.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe("a")

    // Verify it has cursor pointer (clickable)
    const cursor = await projectBreadcrumbLink.evaluate((el) => window.getComputedStyle(el).cursor)
    expect(cursor).toBe("pointer")
  })

  test("domain breadcrumb is not clickable", async ({ page }) => {
    await navigateToProject(page)

    // The breadcrumb should have a span for domain (no onClick, no href)
    const breadcrumb = page.locator(".juno-breadcrumb")
    await expect(breadcrumb).toBeVisible()

    // Domain item: first span.juno-breadcrumb-item (after Home icon)
    const domainCrumb = breadcrumb.locator("span.juno-breadcrumb-item").first()
    await expect(domainCrumb).toBeVisible()
    const cursor = await domainCrumb.evaluate((el) => window.getComputedStyle(el).cursor)
    expect(cursor).not.toBe("pointer")
  })
})
