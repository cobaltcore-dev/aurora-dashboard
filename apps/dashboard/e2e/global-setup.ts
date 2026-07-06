import { chromium, FullConfig } from "@playwright/test"
import * as dotenv from "dotenv"

dotenv.config()

/**
 * Global setup runs once before all tests
 * Logs in and saves authentication state to be reused across all tests
 * This prevents rate limiting by avoiding redundant login requests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const domain = process.env.TEST_DOMAIN
  const username = process.env.TEST_MEMBER_USER
  const password = process.env.TEST_MEMBER_PASSWORD

  if (!domain || !username || !password) {
    throw new Error("TEST_DOMAIN, TEST_MEMBER_USER, TEST_MEMBER_PASSWORD must be set in environment")
  }

  try {
    // Navigate to login page
    await page.goto(baseURL || "http://localhost:3000")

    // Wait for the login form to be visible
    await page.waitForSelector("input#domain", { timeout: 10000 })

    // Fill in credentials
    await page.fill("input#domain", domain)
    await page.fill("input#user", username)
    await page.fill("input#password", password)

    // Submit login form
    await page.click('button:has-text("Sign In")')

    // Wait for redirect to projects page after successful login
    await page.waitForURL("**/projects", { timeout: 30000 })

    // Save signed-in state to 'storageState.json'
    await page.context().storageState({ path: "e2e/playwright-results/storageState.json" })
  } catch (error) {
    console.error("Global setup failed:", error)
    // Take a screenshot for debugging
    await page.screenshot({ path: "e2e/playwright-results/global-setup-error.png" })
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
