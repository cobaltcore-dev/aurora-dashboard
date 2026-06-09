import { Page } from "@playwright/test"
import { setupErrorTracking } from "./test-helpers"

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
 * @returns Array that collects errors during login flow (use with expectNoJavaScriptErrors)
 */
export async function loginAsTestUser(page: Page, options: LoginOptions = {}): Promise<string[]> {
  const domain = options.domain || process.env.TEST_DOMAIN
  const username = options.useAdmin ? process.env.TEST_ADMIN_USER : process.env.TEST_MEMBER_USER
  const password = options.useAdmin ? process.env.TEST_ADMIN_PASSWORD : process.env.TEST_MEMBER_PASSWORD

  if (!domain || !username || !password) {
    throw new Error(
      "TEST_DOMAIN, TEST_MEMBER_USER, TEST_MEMBER_PASSWORD (and optionally TEST_ADMIN_USER, TEST_ADMIN_PASSWORD) must be set in environment"
    )
  }

  return await auroraLogin(page, domain, username, password)
}

/**
 * Perform login as admin user
 *
 * @param page - Playwright page object
 * @param options - Optional configuration (domain override)
 * @returns Array that collects errors during login flow (use with expectNoJavaScriptErrors)
 */
export async function loginAsAdminUser(page: Page, options: Omit<LoginOptions, "useAdmin"> = {}): Promise<string[]> {
  return loginAsTestUser(page, { ...options, useAdmin: true })
}

/**
 * Core login function - performs the actual login steps
 *
 * @param page - Playwright page object
 * @param domain - The domain to login to
 * @param username - The username
 * @param password - The password
 * @returns Array that collects errors during login flow
 */
async function auroraLogin(page: Page, domain: string, username: string, password: string): Promise<string[]> {
  // Set up error tracking BEFORE navigation
  const errors = setupErrorTracking(page)

  // Navigate to login page (root is now the login page)
  await page.goto("/")

  // Fill in credentials
  await page.fill("input#domain", domain)
  await page.fill("input#user", username)
  await page.fill("input#password", password)

  // Submit login form
  await page.click('button:has-text("Sign In")')

  // Wait for redirect to projects page after successful login
  await page.waitForURL("/projects", { timeout: 10000 })

  // Verify we're logged in by checking we're not on login page (root route)
  const currentUrl = page.url()
  if (currentUrl === page.context().baseURL || currentUrl.endsWith("/")) {
    throw new Error("Login failed: Still on login page")
  }

  return errors
}
