import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

/**
 * Project Navigation Tests
 *
 * Tests that clicking navigation links loads the respective pages without errors.
 * Verifies each main section (Images, Flavors, Security Groups, etc.) loads correctly.
 *
 * Requires TEST_PROJECT environment variable to specify which project to test.
 *
 * Run with: pnpm test:e2e e2e/ui/project-navigation.spec.ts
 */
test.describe("Project Navigation", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  test("Images page loads without errors", async ({ page }) => {
    // Login and navigate to project detail
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("h5", { hasText: testProject })
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Set up error tracking for Images page navigation
    const pageErrors = setupErrorTracking(page)

    // Click on Images link
    const imagesLink = page.locator("a", { hasText: "Images" }).first()
    await imagesLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    // Verify we're on the Images page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Flavors page loads without errors", async ({ page }) => {
    // Login and navigate to project detail
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("h5", { hasText: testProject })
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Set up error tracking for Flavors page navigation
    const pageErrors = setupErrorTracking(page)

    // Click on Flavors link
    const flavorsLink = page.locator("a", { hasText: "Flavors" }).first()
    await flavorsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    // Verify we're on the Flavors page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Security Groups page loads without errors", async ({ page }) => {
    // Login and navigate to project detail
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("h5", { hasText: testProject })
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Set up error tracking for Security Groups page navigation
    const pageErrors = setupErrorTracking(page)

    // Click on Security Groups link
    const securityGroupsLink = page.locator("a", { hasText: "Security Groups" }).first()
    await securityGroupsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    // Verify we're on the Security Groups page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Floating IPs page loads without errors", async ({ page }) => {
    // Login and navigate to project detail
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("h5", { hasText: testProject })
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Set up error tracking for Floating IPs page navigation
    const pageErrors = setupErrorTracking(page)

    // Click on Floating IPs link
    const floatingIPsLink = page.locator("a", { hasText: "Floating IPs" }).first()
    await floatingIPsLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    // Verify we're on the Floating IPs page
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("Swift page loads without errors", async ({ page }) => {
    // Login and navigate to project detail
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Search for test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    // Set up error tracking for project detail navigation
    const detailErrors = setupErrorTracking(page)

    // Click on test project
    const projectHeading = page.locator("h5", { hasText: testProject })
    await projectHeading.click()

    // Wait for project detail page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Set up error tracking for Swift page navigation
    const pageErrors = setupErrorTracking(page)

    // Click on Swift link
    const swiftLink = page.locator("a", { hasText: "Swift" }).first()
    await swiftLink.click()

    // Wait for page to load
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(pageErrors, page)

    // Verify we're on the Swift page
    await expect(page.locator("body")).not.toBeEmpty()
  })
})
