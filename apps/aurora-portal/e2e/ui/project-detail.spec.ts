import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors } from "../helpers/test-helpers"

/**
 * Project Detail View Tests
 *
 * Tests the project detail page navigation and menu items.
 * Verifies that all expected navigation links are present.
 *
 * Run with: pnpm test:e2e e2e/ui/project-detail.spec.ts
 */
test.describe("Project Detail View", () => {
  test.beforeEach(async ({ page }) => {
    // Login and land on projects overview
    await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Search for demo project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill("demo")
    await page.waitForTimeout(500)

    // Click on demo project
    const demoProjectHeading = page.locator('h1.juno-content-heading', { hasText: "demo" })
    await demoProjectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)
  })

  test("has all required navigation links", async ({ page }) => {
    // Check for Images link
    const imagesLink = page.locator('a', { hasText: "Images" })
    await expect(imagesLink).toBeVisible()

    // Check for Flavors link
    const flavorsLink = page.locator('a', { hasText: "Flavors" })
    await expect(flavorsLink).toBeVisible()

    // Check for Security Groups link
    const securityGroupsLink = page.locator('a', { hasText: "Security Groups" })
    await expect(securityGroupsLink).toBeVisible()

    // Check for Floating IPs link
    const floatingIPsLink = page.locator('a', { hasText: "Floating IPs" })
    await expect(floatingIPsLink).toBeVisible()

    // Check for Swift link
    const swiftLink = page.locator('a', { hasText: "Swift" })
    await expect(swiftLink).toBeVisible()
  })

  test("navigation links are clickable", async ({ page }) => {
    // Test that Images link is clickable
    const imagesLink = page.locator('a', { hasText: "Images" }).first()
    await expect(imagesLink).toBeEnabled()

    // Verify link has href attribute
    const href = await imagesLink.getAttribute('href')
    expect(href).toBeTruthy()
  })
})
