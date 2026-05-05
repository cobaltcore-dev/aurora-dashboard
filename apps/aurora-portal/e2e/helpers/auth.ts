import { Page } from "@playwright/test"

/**
 * Authentication helper for Aurora Portal E2E tests
 * Provides reusable login functionality
 */

interface LoginOptions {
  domain?: string
  useAdmin?: boolean
}

/**
 * Perform login with test user credentials from environment
 *
 * @param page - Playwright page object
 * @param options - Optional configuration (domain override, admin vs member user)
 */
export async function loginAsTestUser(page: Page, options: LoginOptions = {}) {
  const domain = options.domain || process.env.TEST_DOMAIN
  const username = options.useAdmin ? process.env.TEST_ADMIN_USER : process.env.TEST_MEMBER_USER
  const password = options.useAdmin ? process.env.TEST_ADMIN_PASSWORD : process.env.TEST_MEMBER_PASSWORD

  if (!domain || !username || !password) {
    throw new Error(
      "TEST_DOMAIN, TEST_MEMBER_USER, TEST_MEMBER_PASSWORD (and optionally TEST_ADMIN_USER, TEST_ADMIN_PASSWORD) must be set in environment"
    )
  }

  await auroraLogin(page, domain, username, password)
}

/**
 * Perform login as admin user
 *
 * @param page - Playwright page object
 * @param options - Optional configuration (domain override)
 */
export async function loginAsAdminUser(page: Page, options: Omit<LoginOptions, "useAdmin"> = {}) {
  return loginAsTestUser(page, { ...options, useAdmin: true })
}

/**
 * Core login function - performs the actual login steps
 *
 * @param page - Playwright page object
 * @param domain - The domain to login to
 * @param username - The username
 * @param password - The password
 */
async function auroraLogin(page: Page, domain: string, username: string, password: string) {
  // Navigate to login page
  await page.goto("/auth/login")

  // Fill in credentials
  await page.fill("input#domain", domain)
  await page.fill("input#user", username)
  await page.fill("input#password", password)

  // Submit login form
  await page.click('button:has-text("Sign In")')

  // Wait for redirect to accounts page after successful login
  await page.waitForURL("**/accounts/**", { timeout: 10000 })

  // Verify we're logged in by checking we're not on login page
  const currentUrl = page.url()
  if (currentUrl.includes("/auth/login")) {
    throw new Error("Login failed: Still on login page")
  }
}
