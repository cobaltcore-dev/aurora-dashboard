import { test, expect, type Page } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Project Navigation Tests
 *
 * Tests that clicking service cards loads the respective pages without errors.
 * Verifies each main section (Images, Flavors, Security Groups, etc.) loads correctly.
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/project-navigation.spec.ts
 */
test.describe("Project Navigation", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  async function navigateToProject(page: Page) {
    const errors = await loginAsTestUser(page)
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

  test("Images page loads without errors", async ({ page }) => {
    await navigateToProject(page)

    const pageErrors = setupErrorTracking(page)
    await page.locator('[data-testid="service-card-label"]', { hasText: "Images" }).click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Flavors page loads without errors", async ({ page }) => {
    await navigateToProject(page)

    const pageErrors = setupErrorTracking(page)
    await page.locator('[data-testid="service-card-label"]', { hasText: "Flavors" }).click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Security Groups page loads without errors", async ({ page }) => {
    await navigateToProject(page)

    const pageErrors = setupErrorTracking(page)
    await page.locator('[data-testid="service-card-label"]', { hasText: "Security Groups" }).click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Floating IPs page loads without errors", async ({ page }) => {
    await navigateToProject(page)

    const pageErrors = setupErrorTracking(page)
    await page.locator('[data-testid="service-card-label"]', { hasText: "Floating IPs" }).click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Object Storage (Swift) page loads without errors", async ({ page }) => {
    await navigateToProject(page)

    const pageErrors = setupErrorTracking(page)
    await page.locator('[data-testid="service-card-label"]', { hasText: "Object Storage (Swift)" }).click()
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    await expect(page.locator("body")).not.toBeEmpty()
  })
})
