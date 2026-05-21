# Playwright E2E Smoke Tests

## Goal

Implement Playwright E2E smoke tests for Aurora Portal that run in CI against a running instance to verify:

1. Public routes load without JavaScript errors
2. OpenStack UIs load successfully for authenticated users

## Requirements

### Phase 1: Unauthenticated Tests

- Landing page (`/`) loads without errors
- About page (`/about`) loads without errors
- Login page (`/auth/login`) renders form correctly
- Login form has basic HTML5 validation
- Protected routes redirect to login page

### Phase 2: Authenticated Tests

- Login via test credentials works
- Accounts page loads after authentication
- Projects list page loads
- Compute UI view loads without errors
- Network UI view loads without errors
- Storage UI view loads without errors

## Architecture

### Test Structure

```
e2e/
├── tests/
│   ├── smoke.spec.ts               # Unauthenticated public routes
│   ├── login.spec.ts               # Login functionality
│   ├── project-detail.spec.ts      # Project detail page tests
│   ├── project-navigation.spec.ts  # Project navigation tests
│   └── project-overview.spec.ts    # Project overview tests
└── helpers/
    └── test-helpers.ts             # Shared utilities
```

### Test Approach

- **Smoke tests only**: Verify pages load, no detailed interaction testing
- **Error detection**: Check for console errors and JavaScript crashes
- **Browser**: Chromium only (can expand later)
- **Parallel**: Tests run in parallel where possible

### Authentication Strategy

- Uses global setup (`playwright.config.ts`) to handle login once per test run
- Login state stored in `.auth/user.json` (git-ignored)
- Store credentials in `.env.test.local` (git-ignored)
- Tests reuse authenticated session via `storageState`
- Tests fail gracefully if credentials missing

## CI Integration

### GitHub Actions Workflow

- Runs on PR to `main`/`develop` branches
- Builds aurora-portal in production mode
- Starts server on port 4500
- Runs unauthenticated tests (always)
- Runs authenticated tests (only if secrets configured)
- Uploads HTML report as artifact on failure

### Required GitHub Secrets (for authenticated tests)

- `TEST_DOMAIN`
- `TEST_USER`
- `TEST_PASSWORD`
- `TEST_IDENTITY_ENDPOINT` (optional, defaults to configured endpoint)

## Configuration

### Playwright Config

- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- Timeout: 30s per test
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI (serial), 4 locally
- Reporters: HTML + GitHub (CI), HTML + list (local)
- Artifacts: Screenshots on failure, video on retry, trace on retry
- Global setup: `e2e/global-setup.ts` handles authentication

### Error Detection

JavaScript error detection is environment-aware:

- **Development mode** (`NODE_ENV !== 'production'`):
  - Filters known harmless errors (ResizeObserver, React dev warnings, nested button warnings)
  - Allows development without test noise from framework warnings
- **Production mode**:
  - Reports all JavaScript errors without filtering
  - Ensures production builds are error-free

### Test Environment Variables

Test credentials loaded from `.env.test.local`:

```bash
TEST_DOMAIN=your-domain
TEST_USER=your-user
TEST_PASSWORD=your-password
TEST_PROJECT=your-project-id  # Optional: defaults to first available project
```

## NPM Scripts

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed",
"test:e2e:debug": "playwright test --debug",
"test:e2e:report": "playwright show-report"
```

## Dependencies

- `@playwright/test` (version pinned to match CI image)
- Existing Aurora Portal test infrastructure (Vitest)
- Running Aurora Portal instance (dev or production)
- OpenStack test account (for authenticated tests)

## Docker Images

### Local Development

For local E2E testing, use the official Microsoft Playwright image:

```bash
docker run --rm --network host -v $(pwd):/work -w /work/apps/aurora-portal \
  mcr.microsoft.com/playwright:v1.59.1-noble \
  npx playwright test
```
