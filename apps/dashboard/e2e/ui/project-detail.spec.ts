import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Project Detail View Tests
 *
 * Tests the project detail page service cards, breadcrumb behaviour, and cursor states.
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/project-detail.spec.ts
 */
test.describe("Project Detail View", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  async function navigateToProject(page: Parameters<Parameters<typeof test>[1]>[0]) {
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    const detailErrors = setupErrorTracking(page)
    await page.locator('[data-testid="project-name"]', { hasText: testProject }).click()
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

    // Now the project name breadcrumb should be a button
    const breadcrumbButtons = page.locator(".juno-breadcrumb-item button, button.juno-breadcrumb-item")
    const projectCrumb = breadcrumbButtons.filter({ hasText: testProject })
    await expect(projectCrumb).toBeVisible()
    const tagName = await projectCrumb.evaluate((el) => el.tagName.toLowerCase())
    expect(tagName).toBe("button")
  })

  test("domain breadcrumb is not clickable", async ({ page }) => {
    await navigateToProject(page)

    // The breadcrumb should have a span for domain (no onClick, no href)
    const breadcrumb = page.locator(".juno-breadcrumb")
    await expect(breadcrumb).toBeVisible()

    // Domain item: second breadcrumb item (after Home), rendered as span
    const spans = breadcrumb.locator("span.juno-breadcrumb-item")
    const count = await spans.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const cursor = await spans.nth(i).evaluate((el) => window.getComputedStyle(el).cursor)
      expect(cursor).not.toBe("pointer")
    }
  })
})
