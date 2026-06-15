# E2E Tests - Aurora Dashboard (OpenStack)

End-to-end tests for the Aurora Dashboard OpenStack implementation using Playwright.

## Overview

This test suite covers the core Aurora Dashboard functionality for OpenStack environments, including:

- **Authentication** - Login flows and session management
- **Projects Overview** - Project listing, search, and navigation
- **Project Details** - Navigation within projects
- **OpenStack UIs** - Images, Flavors, Security Groups, Floating IPs, Swift

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your test credentials:

```bash
# In /workspace/aurora-dashboard-OS/apps/dashboard/
cp .env.example .env
```

Required environment variables:

```env
# Test domain for authentication
TEST_DOMAIN=your-test-domain

# Regular test user credentials
TEST_MEMBER_USER=your-member-user
TEST_MEMBER_PASSWORD=your-member-password

# Admin test user credentials (optional)
TEST_ADMIN_USER=your-admin-user
TEST_ADMIN_PASSWORD=your-admin-password

# Test project to navigate into (default: demo)
TEST_PROJECT=demo

# Playwright base URL (optional, defaults to http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### 3. Start the Application

```bash
pnpm dev
```

The app should be running on `http://localhost:3000` (or your configured `PLAYWRIGHT_BASE_URL`).

## Running Tests

### All Tests

```bash
pnpm test:e2e
```

### Interactive UI Mode

```bash
pnpm test:e2e:ui
```

This opens Playwright's UI where you can:

- Select which tests to run
- Watch tests execute in real-time
- Debug failed tests
- Time-travel through test steps

### Headed Mode (Visible Browser)

```bash
pnpm test:e2e:headed
```

### Debug Mode

```bash
pnpm test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Specific Test File

```bash
pnpm test:e2e e2e/smoke/authenticated.spec.ts
pnpm test:e2e e2e/ui/projects-overview.spec.ts
```

### Specific Test Suite

```bash
pnpm test:e2e --grep "Projects Overview"
```

### View Test Report

After running tests, view the HTML report:

```bash
pnpm test:e2e:report
```

Opens on `http://localhost:3010`

## Test Categories

### Smoke Tests (`smoke/`)

Fast, high-level tests that verify basic functionality:

- **Unauthenticated** - Public pages load without errors
- **Authenticated** - Protected pages load after login

Run smoke tests only:

```bash
pnpm test:e2e e2e/smoke
```

### UI Tests (`ui/`)

Detailed functional tests for user interactions:

- **Projects Overview** - Search, filtering, project visibility
- **Project Detail** - Navigation links, menu items
- **Project Navigation** - Images, Flavors, Security Groups, Floating IPs, Swift pages

Run UI tests only:

```bash
pnpm test:e2e e2e/ui
```

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from "@playwright/test"
import { loginAsTestUser } from "../helpers/auth"
import { expectPageLoaded, expectNoJavaScriptErrors, setupErrorTracking } from "../helpers/test-helpers"

test.describe("My Feature", () => {
  const testProject = process.env.TEST_PROJECT || "demo"

  test("should do something", async ({ page }) => {
    // Login
    const errors = await loginAsTestUser(page)
    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(errors, page)

    // Navigate to test project
    const searchInput = page.locator('input[placeholder="Search..."]')
    await searchInput.fill(testProject)
    await page.waitForTimeout(500)

    const detailErrors = setupErrorTracking(page)
    const projectHeading = page.locator("h1.juno-content-heading", { hasText: testProject })
    await projectHeading.click()

    await expectPageLoaded(page)
    await expectNoJavaScriptErrors(detailErrors, page)

    // Your test assertions here
    await expect(page.locator("text=Something")).toBeVisible()
  })
})
```

### Navigation Pattern

Most tests follow this pattern:

1. **Login** → lands on `/projects`
2. **Search** for test project
3. **Click** project heading → enters project detail view
4. **Navigate** to specific section (Images, Flavors, etc.)
5. **Assert** expected behavior

## Test Patterns

### Pattern: Test a Page Loads Without Errors

```typescript
test("page loads without errors", async ({ page }) => {
  const errors = await loginAsTestUser(page)
  await expectPageLoaded(page)
  await expectNoJavaScriptErrors(errors, page)

  // Verify page content
  await expect(page.locator("body")).not.toBeEmpty()
})
```

### Pattern: Navigate and Test

```typescript
test("navigation works", async ({ page }) => {
  const errors = await loginAsTestUser(page)
  await expectPageLoaded(page)

  // Set up error tracking for next navigation
  const navErrors = setupErrorTracking(page)

  // Click a link
  await page.click("a", { hasText: "Images" })

  await expectPageLoaded(page)
  await expectNoJavaScriptErrors(navErrors, page)
})
```

### Pattern: Search and Filter

```typescript
test("search works", async ({ page }) => {
  const errors = await loginAsTestUser(page)
  await expectPageLoaded(page)

  const searchInput = page.locator('input[placeholder="Search..."]')
  await searchInput.fill("test-query")
  await page.waitForTimeout(500) // Wait for filtering

  // Assert results
  await expect(page.locator("text=test-query")).toBeVisible()
})
```

## Debugging Tips

### Screenshot on Failure

Tests automatically capture screenshots on failure. Find them in:

```
e2e/playwright-results/
```

### Video Recording

Videos are recorded for failed tests. Configure in `playwright.config.ts`:

```typescript
video: "retain-on-failure"
```

### Slow Down Tests

Add `page.waitForTimeout()` to observe behavior:

```typescript
await page.waitForTimeout(2000) // Wait 2 seconds
```

### Playwright Inspector

Use `await page.pause()` to pause execution:

```typescript
await page.pause() // Opens Playwright Inspector
```

### Debug with Headed Browser

```bash
pnpm test:e2e:headed
```

### Debug Specific Test

```bash
pnpm test:e2e:debug e2e/ui/projects-overview.spec.ts
```

### Parallel Execution

Tests run in parallel by default (`fullyParallel: true`). Disable for debugging:

```bash
pnpm test:e2e --workers=1
```

### Retries

Tests retry on failure:

- **CI:** 3 retries
- **Local:** 1 retry

Override with:

```bash
pnpm test:e2e --retries=0  # No retries
```

## Troubleshooting

### "Element not visible" errors

**Causes:**

- Element not yet rendered
- Wrong selector
- Element hidden by CSS
- Not in correct navigation context

**Solutions:**

```typescript
// Increase timeout
await expect(element).toBeVisible({ timeout: 10000 })

// Wait for page load
await expectPageLoaded(page)

// Check you're in the right context (logged in, in project, etc.)
```

### "Navigation timeout" errors

**Causes:**

- App not running
- Slow network/API
- Wrong base URL

**Solutions:**

```bash
# Check app is running
curl http://localhost:3000

# Check PLAYWRIGHT_BASE_URL in .env
echo $PLAYWRIGHT_BASE_URL

# Increase timeout in playwright.config.ts
```

### Login fails

**Causes:**

- Wrong credentials
- Wrong domain
- Identity endpoint unreachable

**Solutions:**

```bash
# Verify credentials in .env
cat .env | grep TEST_

# Test login manually in browser
# Check identity endpoint is accessible
```

### Tests pass locally but fail in CI

**Causes:**

- Missing environment variables
- Network restrictions
- Browser differences
- Timing issues

**Solutions:**

```yaml
# Set environment variables in CI
env:
  TEST_DOMAIN: ${{ secrets.TEST_DOMAIN }}

# Install browsers explicitly
- run: npx playwright install --with-deps chromium

# Increase retries for flaky tests
retries: 3
```

### JavaScript errors in tests

**Causes:**

- Actual bugs in the app
- Known harmless warnings
- Flaky async behavior

**Solutions:**

```typescript
// Check the error message
await expectNoJavaScriptErrors(errors, page)

// Add to filter in test-helpers.ts if harmless
if (error.includes("KnownHarmlessError")) return false
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Test Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

### Test Organization

- **Smoke tests** → Quick validation, broad coverage, shallow depth
- **UI tests** → Detailed functionality, specific user flows, deep assertions

Choose the right category for your test based on scope and depth.
