import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Project Detail View Tests
 *
 * Tests the project detail page navigation and menu items.
 * Verifies that all expected navigation links are present.
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/project-detail.spec.ts
 */
test.describe("Project Detail View", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  test("has all required navigation links", async ({ page }) => {
    // Login and land on projects overview
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail page navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("p", { hasText: testProject }).first()
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Check for Images link
    const imagesLink = page.locator("a", { hasText: "Images" })
    await expect(imagesLink).toBeVisible()

    // Check for Flavors link
    const flavorsLink = page.locator("a", { hasText: "Flavors" })
    await expect(flavorsLink).toBeVisible()

    // Check for Security Groups link
    const securityGroupsLink = page.locator("a", { hasText: "Security Groups" })
    await expect(securityGroupsLink).toBeVisible()

    // Check for Floating IPs link
    const floatingIPsLink = page.locator("a", { hasText: "Floating IPs" })
    await expect(floatingIPsLink).toBeVisible()

    // Check for Swift link
    const swiftLink = page.locator("a", { hasText: "Swift" })
    await expect(swiftLink).toBeVisible()
  })

  test("navigation links are clickable", async ({ page }) => {
    // Login and land on projects overview
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail page navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("p", { hasText: testProject }).first()
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Test that Images link is clickable
    const imagesLink = page.locator("a", { hasText: "Images" }).first()
    await expect(imagesLink).toBeEnabled()

    // Verify link has href attribute
    const href = await imagesLink.getAttribute("href")
    expect(href).toBeTruthy()
  })
})
