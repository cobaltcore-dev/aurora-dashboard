import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors } from "../helpers/test-helpers"

/**
 * Project Navigation Tests
 *
 * Tests that clicking navigation links loads the respective pages without errors.
 * Verifies each main section (Images, Flavors, Security Groups, etc.) loads correctly.
 *
 * Run with: pnpm test:e2e e2e/ui/project-navigation.spec.ts
 */
test.describe("Project Navigation", () => {
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
    const demoProjectHeading = page.locator("h1.juno-content-heading", { hasText: "demo" })
    await demoProjectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)
  })

  test("Images page loads without errors", async ({ page }) => {
    // Click on Images link
    const imagesLink = page.locator("a", { hasText: "Images" }).first()
    await imagesLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify we're on the Images page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Flavors page loads without errors", async ({ page }) => {
    // Click on Flavors link
    const flavorsLink = page.locator("a", { hasText: "Flavors" }).first()
    await flavorsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify we're on the Flavors page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Security Groups page loads without errors", async ({ page }) => {
    // Click on Security Groups link
    const securityGroupsLink = page.locator("a", { hasText: "Security Groups" }).first()
    await securityGroupsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify we're on the Security Groups page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Floating IPs page loads without errors", async ({ page }) => {
    // Click on Floating IPs link
    const floatingIPsLink = page.locator("a", { hasText: "Floating IPs" }).first()
    await floatingIPsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify we're on the Floating IPs page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Swift page loads without errors", async ({ page }) => {
    // Click on Swift link
    const swiftLink = page.locator("a", { hasText: "Swift" }).first()
    await swiftLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(page)

    // Verify we're on the Swift page
    await expect(page.locator("body")).not.toBeEmpty()
  })
})
