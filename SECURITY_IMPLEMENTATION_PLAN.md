# Security Implementation Plan - Aurora Dashboard

**Status:** Ready for Implementation  
**Target Start:** Immediate  
**Estimated Duration:** 6 weeks  
**Team Size Recommended:** 2-3 developers

---

## Table of Contents

1. [Immediate Actions (Today)](#immediate-actions-today)
2. [Week 1: Emergency Hotfix](#week-1-emergency-hotfix)
3. [Week 2-3: Security Hardening](#week-2-3-security-hardening)
4. [Week 4: Session Security](#week-4-session-security)
5. [Week 5-6: Authorization Hardening](#week-5-6-authorization-hardening)
6. [Development Workflow](#development-workflow)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Communication Plan](#communication-plan)

---

## Immediate Actions (Today)

### Day 1: Monday - Core Infrastructure

#### Task 1.1: Update Service Client (3 hours)

**File:** `packages/signal-openstack/src/client.ts`

```typescript
// 1. Add allowAbsoluteUrl parameter
interface BuildRequestUrlOptions {
  base?: string
  path?: string
  searchParams?: string
  allowAbsoluteUrl?: boolean // NEW: explicit opt-in
}

const buildRequestUrl = function ({
  base,
  path,
  searchParams,
  allowAbsoluteUrl = false, // Default: reject absolute URLs
}: BuildRequestUrlOptions): URL {
  // 2. Add rejection logic
  if (path?.startsWith("http")) {
    if (!allowAbsoluteUrl) {
      throw new SignalOpenstackError(
        "Absolute URLs rejected for security. " + "Use relative paths or set allowAbsoluteUrl=true for trusted sources."
      )
    }
    return new URL(path)
  }

  // Rest of existing logic...
  if (!base) {
    throw new SignalOpenstackError("Base URL required for relative paths")
  }

  const requestUrl = new URL(base)
  if (path) {
    requestUrl.pathname = path.startsWith("/") ? path : `${requestUrl.pathname.replace(/\/$/, "")}/${path}`
  }

  if (searchParams) {
    requestUrl.search = searchParams
  }

  return requestUrl
}

// 3. Update method signatures
export async function request(options: RequestOptions): Promise<Response> {
  const url = buildRequestUrl({
    base: options.base,
    path: options.path,
    searchParams: options.searchParams,
    allowAbsoluteUrl: options.allowAbsoluteUrl, // NEW
  })

  // ... rest of existing logic
}
```

**Test:**

```typescript
// packages/signal-openstack/src/client.test.ts

describe("buildRequestUrl security", () => {
  it("should reject HTTP absolute URLs by default", () => {
    expect(() => buildRequestUrl({ base: "https://api.example.com", path: "http://evil.com" })).toThrow(
      "Absolute URLs rejected for security"
    )
  })

  it("should reject HTTPS absolute URLs by default", () => {
    expect(() => buildRequestUrl({ base: "https://api.example.com", path: "https://evil.com" })).toThrow(
      "Absolute URLs rejected for security"
    )
  })

  it("should allow absolute URLs with explicit flag", () => {
    const url = buildRequestUrl({
      path: "https://api.example.com/v2/images?marker=abc",
      allowAbsoluteUrl: true,
    })
    expect(url.toString()).toBe("https://api.example.com/v2/images?marker=abc")
  })

  it("should allow relative URLs", () => {
    const url = buildRequestUrl({
      base: "https://api.example.com/v2",
      path: "images/abc-123",
    })
    expect(url.pathname).toBe("/v2/images/abc-123")
  })
})
```

**Run test:**

```bash
npm run test -- client.test.ts
```

---

#### Task 1.2: Create Validation Helpers (2 hours)

**File:** `packages/aurora/src/server/helpers/validationHelpers.ts` (NEW)

```typescript
import { TRPCError } from "@trpc/server"

/**
 * Validate that a URL is relative (not absolute).
 * Used to prevent SSRF attacks via user-controlled URLs.
 */
export function validateRelativeUrl(url: string, label = "URL"): void {
  if (!url || typeof url !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} must be a non-empty string`,
    })
  }

  // Reject absolute URLs (http://, https://, //)
  if (url.match(/^(https?:)?\/\//)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} must be a relative URL (absolute URLs are not allowed)`,
    })
  }

  // Reject data: and javascript: URLs
  if (url.match(/^(data|javascript):/i)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} contains invalid protocol`,
    })
  }
}

/**
 * Validate Swift account name format.
 * Prevents path traversal and SSRF via account override.
 */
export function validateSwiftAccount(account: string): void {
  if (!account || typeof account !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Account name must be a non-empty string",
    })
  }

  // Swift account format: AUTH_<identifier>
  // Allow alphanumeric, underscore, hyphen
  const SWIFT_ACCOUNT_RE = /^AUTH_[a-zA-Z0-9_-]+$/

  if (!SWIFT_ACCOUNT_RE.test(account)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid Swift account name format (must be AUTH_<identifier>)",
    })
  }

  // Additional safety: reject if contains path traversal
  if (account.includes("..") || account.includes("/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Account name contains invalid characters",
    })
  }
}
```

**Test:**

```typescript
// packages/aurora/src/server/helpers/validationHelpers.test.ts

describe("validateRelativeUrl", () => {
  it("should accept relative URLs", () => {
    expect(() => validateRelativeUrl("v2/images?marker=abc")).not.toThrow()
    expect(() => validateRelativeUrl("/images/123")).not.toThrow()
    expect(() => validateRelativeUrl("../images/123")).not.toThrow()
  })

  it("should reject HTTP absolute URLs", () => {
    expect(() => validateRelativeUrl("http://evil.com")).toThrow("absolute URLs are not allowed")
  })

  it("should reject HTTPS absolute URLs", () => {
    expect(() => validateRelativeUrl("https://evil.com")).toThrow("absolute URLs are not allowed")
  })

  it("should reject protocol-relative URLs", () => {
    expect(() => validateRelativeUrl("//evil.com")).toThrow("absolute URLs are not allowed")
  })
})

describe("validateSwiftAccount", () => {
  it("should accept valid Swift account names", () => {
    expect(() => validateSwiftAccount("AUTH_abc123")).not.toThrow()
    expect(() => validateSwiftAccount("AUTH_test-project_123")).not.toThrow()
  })

  it("should reject HTTP URLs", () => {
    expect(() => validateSwiftAccount("http://evil.com")).toThrow("Invalid Swift account name format")
  })

  it("should reject path traversal", () => {
    expect(() => validateSwiftAccount("AUTH_abc/../admin")).toThrow("invalid characters")
  })

  it("should reject non-AUTH format", () => {
    expect(() => validateSwiftAccount("malicious-account")).toThrow("Invalid Swift account name format")
  })
})
```

**Run test:**

```bash
npm run test -- validationHelpers.test.ts
```

---

### Day 2: Tuesday - Fix Glance SSRF (Finding #1)

#### Task 2.1: Add Pagination URL Validation (2 hours)

**File:** `packages/aurora/src/server/Compute/routers/imageRouter.ts`

```typescript
import { validateRelativeUrl } from "../../helpers/validationHelpers"

// Find the listPaginated procedure (around line 220)
listPaginated: projectScopedProcedure
  .input(projectScopedInputSchema.extend(imagesPaginatedInputSchema.shape))
  .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
    return withErrorHandling(async () => {
      const { first, next, ...queryInput } = input

      // ADD VALIDATION: Check pagination URLs before using them
      if (first) {
        validateRelativeUrl(first, "Pagination URL (first)")
      }
      if (next) {
        validateRelativeUrl(next, "Pagination URL (next)")
      }

      const openstackSession = ctx.openstack
      const glance = openstackSession?.service("glance")

      validateComputeService(glance, "glance")

      // Rest of existing logic...
      let currentUrl: string | undefined = first || next || `v2/images?${queryParams.toString()}`
      // ... existing pagination logic
```

**Test:**

```typescript
// packages/aurora/src/server/Compute/routers/imageRouter.test.ts

describe("imageRouter.listPaginated SSRF protection", () => {
  it("should reject absolute URL in first parameter", async () => {
    await expect(
      caller.image.listPaginated({
        project_id: "test-project",
        first: "http://attacker.com/steal",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("absolute URLs are not allowed"),
    })
  })

  it("should reject absolute URL in next parameter", async () => {
    await expect(
      caller.image.listPaginated({
        project_id: "test-project",
        next: "https://attacker.com/steal",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("absolute URLs are not allowed"),
    })
  })

  it("should not call Glance service for malicious URLs", async () => {
    const glanceSpy = jest.spyOn(mockGlance, "get")

    try {
      await caller.image.listPaginated({
        project_id: "test-project",
        first: "http://evil.com",
      })
    } catch (err) {
      // Expected to throw
    }

    expect(glanceSpy).not.toHaveBeenCalled()
  })

  it("should accept relative pagination URLs", async () => {
    const result = await caller.image.listPaginated({
      project_id: "test-project",
      first: "v2/images?marker=abc-123",
    })

    expect(result.images).toBeDefined()
  })

  it("should work without pagination parameters", async () => {
    const result = await caller.image.listPaginated({
      project_id: "test-project",
    })

    expect(result.images).toBeDefined()
  })
})
```

**Run test:**

```bash
npm run test -- imageRouter.test.ts
```

---

### Day 3: Wednesday - Fix Swift SSRF (Finding #2)

#### Task 3.1: Add Swift Account Validation (4 hours)

**File:** `packages/aurora/src/server/Storage/types/swift.ts`

```typescript
import { z } from "zod"
import { validateSwiftAccount } from "../../helpers/validationHelpers"

// Find baseAccountInputSchema (around line 84)
// ADD custom validator
const baseAccountInputSchema = z.object({
  account: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true // Optional field
        try {
          validateSwiftAccount(val)
          return true
        } catch (err) {
          return false
        }
      },
      {
        message: "Invalid Swift account name format (must be AUTH_<identifier>)",
      }
    ),
})
```

**OR better approach - validate in routes:**

**File:** `packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts`

```typescript
import { validateSwiftAccount } from "../../../helpers/validationHelpers"

// Add helper function at top of file
function validateAndGetAccount(account?: string): string {
  if (!account) return ""

  // Validate account format
  validateSwiftAccount(account)

  return account
}

// Apply to ALL Swift procedures that accept account parameter
// Example: listContainers (around line 127)
listContainers: projectScopedProcedure
  .input(projectScopedInputSchema.extend(listContainersInputSchema.shape))
  .query(async ({ input, ctx }): Promise<ContainerSummary[]> => {
    return withErrorHandling(async () => {
      const { account, xNewest, ...queryInput } = input

      // ADD VALIDATION
      const validatedAccount = validateAndGetAccount(account)

      const openstackSession = ctx.openstack
      const swift = openstackSession?.service("swift")

      validateSwiftService(swift)

      // ... rest of existing logic
      const accountPath = validatedAccount || ""
      const url = accountPath ? `${accountPath}?${queryParams}` : `?${queryParams}`
```

**Apply to all affected procedures (21+ operations):**

```bash
# Find all procedures using account parameter
grep -n "account" packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts

# List of procedures to update:
# - listContainers (line 127)
# - createContainer (line 177)
# - getContainerMetadata (line 350)
# - setContainerMetadata (line 383)
# - deleteContainer (line 208)
# - listObjects (line 236)
# - getObjectMetadata (line 269)
# - uploadObject (line 320)
# - downloadObject (line 475)
# - deleteObject (line 439)
# - getAccountMetadata (line 177)
# - setAccountMetadata (line 208)
# - + 9 more operations
```

**Automated refactor script:**

```typescript
// scripts/fix-swift-account-validation.ts

import * as ts from "typescript"
import * as fs from "fs"

const filePath = "packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts"
const sourceCode = fs.readFileSync(filePath, "utf-8")

// Add validateAndGetAccount call after destructuring
// This is a template - adjust based on actual code structure

const modifiedCode = sourceCode
  .replace(/const \{ account, /g, `const { account: rawAccount, `)
  .replace(
    /const accountPath = account \|\| ""/g,
    `const account = validateAndGetAccount(rawAccount)\n      const accountPath = account || ""`
  )

fs.writeFileSync(filePath, modifiedCode)
console.log("✅ Swift account validation added")
```

**Run:**

```bash
npx tsx scripts/fix-swift-account-validation.ts
```

---

#### Task 3.2: Fix Upload Account Header (1 hour)

**File:** `packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts`

```typescript
// Find uploadObjectDirect procedure (around line 1366)
const contentType = headers["x-upload-type"] as string | undefined
const fileSize = headers["x-upload-size"] as string | undefined
const uploadId = (headers["x-upload-id"] as string | undefined)?.trim()
const uploadAccount = headers["x-upload-account"] as string | undefined

// ADD VALIDATION
const validatedUploadAccount = uploadAccount
  ? (() => {
      validateSwiftAccount(uploadAccount)
      return uploadAccount
    })()
  : undefined

// ... later in code (around line 1439)
const url = validatedUploadAccount // Changed from uploadAccount
  ? `${validatedUploadAccount}/${encodeURIComponent(validatedContainer)}/${encodedObject}`
  : `${encodeURIComponent(validatedContainer)}/${encodedObject}`
```

---

#### Task 3.3: Test Swift Account Validation (2 hours)

**File:** `packages/aurora/src/server/Storage/routers/swift/swiftRouter.test.ts`

```typescript
describe("Swift SSRF protection", () => {
  const maliciousAccounts = [
    "http://attacker.com",
    "https://attacker.com",
    "//attacker.com",
    "AUTH_abc/../admin",
    "AUTH_abc/../../etc/passwd",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ]

  describe("listContainers", () => {
    maliciousAccounts.forEach((account) => {
      it(`should reject malicious account: ${account}`, async () => {
        await expect(
          caller.swift.listContainers({
            project_id: "test-project",
            account,
          })
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: expect.stringMatching(/Invalid Swift account|invalid characters/),
        })
      })
    })

    it("should accept valid Swift account names", async () => {
      const result = await caller.swift.listContainers({
        project_id: "test-project",
        account: "AUTH_abc123-test",
      })

      expect(result).toBeDefined()
    })

    it("should not call Swift service for malicious accounts", async () => {
      const swiftSpy = jest.spyOn(mockSwift, "get")

      try {
        await caller.swift.listContainers({
          project_id: "test-project",
          account: "http://evil.com",
        })
      } catch (err) {
        // Expected to throw
      }

      expect(swiftSpy).not.toHaveBeenCalled()
    })
  })

  // Repeat for other key operations:
  // - createContainer
  // - uploadObject
  // - deleteContainer
  // - getContainerMetadata
})
```

**Run full Swift test suite:**

```bash
npm run test -- swiftRouter.test.ts
```

---

### Day 4: Thursday - Integration Testing

#### Task 4.1: Create Security Test Suite (3 hours)

**File:** `tests/security/ssrf-prevention.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"
import { createTestContext } from "../helpers/testContext"

describe("SSRF Prevention - Integration Tests", () => {
  let context: TestContext

  beforeAll(async () => {
    context = await createTestContext()
  })

  afterAll(async () => {
    await context.cleanup()
  })

  describe("Finding #1: Glance Pagination SSRF", () => {
    const ssrfPayloads = [
      "http://169.254.169.254/latest/meta-data/", // AWS metadata
      "http://metadata.google.internal/", // GCP metadata
      "https://attacker.com/steal-token",
      "//attacker.com/steal-token",
      "http://localhost:8080/admin",
      "http://127.0.0.1:8080/admin",
    ]

    ssrfPayloads.forEach((payload) => {
      it(`should block SSRF payload: ${payload}`, async () => {
        const response = await context.request
          .post("/trpc/image.listPaginated")
          .set("Cookie", context.sessionCookie)
          .send({ first: payload })

        expect(response.status).toBe(400)
        expect(response.body.error.message).toMatch(/absolute URLs are not allowed/)
      })
    })

    it("should allow legitimate OpenStack pagination URLs", async () => {
      const response = await context.request
        .post("/trpc/image.listPaginated")
        .set("Cookie", context.sessionCookie)
        .send({ first: "v2/images?marker=abc-123&limit=10" })

      expect(response.status).toBe(200)
      expect(response.body.result.images).toBeDefined()
    })
  })

  describe("Finding #2: Swift Account SSRF", () => {
    const ssrfPayloads = [
      "http://attacker.com",
      "https://attacker.com/steal",
      "AUTH_abc/../../../etc/passwd",
      "AUTH_abc/../../admin/secrets",
    ]

    const swiftOperations = [
      { name: "listContainers", endpoint: "/trpc/swift.listContainers" },
      { name: "createContainer", endpoint: "/trpc/swift.createContainer" },
      { name: "getContainerMetadata", endpoint: "/trpc/swift.getContainerMetadata" },
    ]

    swiftOperations.forEach(({ name, endpoint }) => {
      describe(name, () => {
        ssrfPayloads.forEach((payload) => {
          it(`should block SSRF via account: ${payload}`, async () => {
            const response = await context.request
              .post(endpoint)
              .set("Cookie", context.sessionCookie)
              .send({ account: payload })

            expect(response.status).toBe(400)
            expect(response.body.error.message).toMatch(/Invalid Swift account|invalid characters/)
          })
        })
      })
    })
  })
})
```

**Run:**

```bash
npm run test:integration -- ssrf-prevention.test.ts
```

---

#### Task 4.2: Manual Testing Checklist (2 hours)

**Create test plan document:**

```markdown
# Manual SSRF Testing Checklist

## Setup

- [ ] Start local dev server: `npm run dev`
- [ ] Login as test user
- [ ] Open browser DevTools → Network tab

## Test Case 1: Glance Pagination SSRF

### Malicious Payloads

- [ ] Try: `first: "http://attacker.com"`
  - Expected: 400 Bad Request
  - Error: "absolute URLs are not allowed"

- [ ] Try: `first: "https://attacker.com"`
  - Expected: 400 Bad Request

- [ ] Try: `first: "//attacker.com"`
  - Expected: 400 Bad Request

### Legitimate Payloads

- [ ] Try: `first: "v2/images?marker=abc"`
  - Expected: 200 OK
  - Response contains images array

## Test Case 2: Swift Account SSRF

### Malicious Payloads

- [ ] Try: `account: "http://attacker.com"`
  - Expected: 400 Bad Request
  - Error: "Invalid Swift account"

- [ ] Try: `account: "AUTH_abc/../admin"`
  - Expected: 400 Bad Request
  - Error: "invalid characters"

### Legitimate Payloads

- [ ] Try: `account: "AUTH_test123"`
  - Expected: 200 OK
  - Response contains container list

## Test Case 3: Network Behavior

- [ ] Monitor Network tab during malicious requests
  - [ ] No external HTTP requests should appear
  - [ ] No requests to attacker.com
  - [ ] No requests to metadata endpoints

## Test Case 4: OpenStack Integration

- [ ] Verify legitimate OpenStack operations still work
  - [ ] List images (no pagination)
  - [ ] List images with pagination
  - [ ] List Swift containers
  - [ ] Upload object to Swift
```

**Execute manual tests and document results:**

```bash
# Start dev server
npm run dev

# In another terminal, run curl tests
curl -X POST http://localhost:3000/trpc/image.listPaginated \
  -H "Content-Type: application/json" \
  -d '{"first":"http://attacker.com"}' \
  -b "session=YOUR_SESSION_COOKIE"

# Expected: 400 Bad Request
```

---

### Day 5: Friday - Deployment Preparation

#### Task 5.1: Code Review (2 hours)

**Checklist:**

- [ ] All validation functions have tests
- [ ] All Swift procedures validated
- [ ] No breaking changes to legitimate use cases
- [ ] Error messages are helpful but don't leak internals
- [ ] Documentation updated

**Create PR:**

```bash
git add -A
git commit -m "security: fix P0 SSRF vulnerabilities in Glance and Swift

Fixes:
- Finding #1: Glance pagination SSRF with token forwarding
- Finding #2: Swift account override SSRF with token forwarding

Changes:
- Add absolute URL rejection to service client
- Add Swift account name validation
- Add comprehensive security tests
- Update 21+ Swift procedures with validation

Breaking changes: None
Security impact: Prevents token theft via SSRF

Test coverage: 95%
"

git push origin security/ssrf-hotfix
```

**Create pull request:**

```markdown
# Security Hotfix: SSRF Prevention (P0)

## Summary

Fixes critical SSRF vulnerabilities that allow attackers to steal OpenStack bearer tokens via malicious pagination URLs and Swift account overrides.

## Findings Fixed

- **Finding #1:** Glance pagination SSRF (HIGH severity)
- **Finding #2:** Swift account override SSRF (HIGH severity)

## Changes

1. Added absolute URL rejection to OpenStack service client
2. Added Swift account name validation (AUTH_* format only)
3. Applied validation to 21+ Swift operations
4. Added comprehensive test suite (unit + integration)

## Testing

- [x] All existing tests pass
- [x] New security tests added (95% coverage)
- [x] Manual testing completed
- [x] OpenStack integration verified

## Deployment

- No breaking changes
- No database migrations
- Safe to deploy immediately

## Reviewers

@security-team @backend-team
```

---

#### Task 5.2: Staging Deployment (2 hours)

**Deploy to staging:**

```bash
# Merge to staging branch
git checkout staging
git merge security/ssrf-hotfix
git push origin staging

# Deploy via CI/CD
# (adjust to your deployment process)
```

**Staging verification checklist:**

```markdown
# Staging Verification

## Smoke Tests

- [ ] Application starts without errors
- [ ] Login works
- [ ] Image list loads
- [ ] Swift container list loads

## Security Tests

- [ ] Malicious pagination URL blocked
- [ ] Malicious Swift account blocked
- [ ] Legitimate operations work

## Performance Tests

- [ ] Response times unchanged
- [ ] No new errors in logs
- [ ] No increase in error rate

## Rollback Plan

If issues found:

1. Revert staging branch
2. Redeploy previous version
3. Investigate and fix
4. Redeploy hotfix
```

---

#### Task 5.3: Production Deployment (End of Week)

**Pre-deployment:**

```bash
# Create production release
git checkout main
git merge security/ssrf-hotfix
git tag -a v1.2.1-security -m "Security hotfix: SSRF prevention"
git push origin main --tags

# Prepare rollback plan
git log --oneline -5  # Note current production commit
```

**Deployment window:**

- **When:** Friday evening / weekend (low traffic)
- **Duration:** 30 minutes
- **Team on call:** 2 engineers + 1 on-call

**Deployment steps:**

1. ✅ Announce maintenance window (if needed)
2. ✅ Deploy to production
3. ✅ Run smoke tests
4. ✅ Monitor for 1 hour
5. ✅ Post-deployment review

**Rollback trigger (revert if):**

- Error rate > 1%
- Legitimate operations fail
- User reports of broken functionality

---

## Week 2-3: Security Hardening

**Goal:** Fix P1 findings (Path traversal, Secret exposure, TempURL scope)  
**Branch:** `security/hardening-sprint`

---

### Week 2, Day 1: Monday - Path Encoding Infrastructure

#### Task: Create Path Encoding Utilities (4 hours)

**File:** `packages/signal-openstack/src/pathHelpers.ts` (NEW)

```typescript
import { TRPCError } from "@trpc/server"

/**
 * Encode a single OpenStack path segment.
 * Rejects path traversal characters and encodes for URL safety.
 *
 * @param segment - Path segment (e.g., flavor ID, container name)
 * @param label - Label for error messages
 * @throws {Error} If segment contains path syntax
 *
 * @example
 * encodeOpenstackPathSegment("flavor-123") // "flavor-123"
 * encodeOpenstackPathSegment("my container") // "my%20container"
 * encodeOpenstackPathSegment("../admin") // throws Error
 */
export function encodeOpenstackPathSegment(segment: string, label = "Path segment"): string {
  if (!segment || typeof segment !== "string") {
    throw new Error(`${label} must be a non-empty string`)
  }

  // Reject path traversal attempts
  if (segment.includes("..") || segment.includes("./")) {
    throw new Error(`${label} contains path traversal characters`)
  }

  // Reject explicit path separators
  if (segment.includes("/")) {
    throw new Error(`${label} must not contain slashes`)
  }

  // Reject URL special characters that could break path parsing
  if (segment.match(/[?#]/)) {
    throw new Error(`${label} contains URL special characters`)
  }

  return encodeURIComponent(segment)
}

/**
 * Encode multiple path segments and join with slashes.
 *
 * @example
 * encodeOpenstackPath("flavors", flavorId, "os-extra_specs")
 * // "flavors/abc-123/os-extra_specs"
 */
export function encodeOpenstackPath(...segments: string[]): string {
  return segments.map((seg, idx) => encodeOpenstackPathSegment(seg, `Path segment ${idx}`)).join("/")
}

/**
 * Validate UUID format (common OpenStack identifier).
 *
 * @throws {TRPCError} If not a valid UUID
 */
export function validateUUID(id: string, label = "ID"): void {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!UUID_RE.test(id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${label}: must be a UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)`,
    })
  }
}

/**
 * Validate and encode an OpenStack resource ID.
 * Combines UUID validation + path encoding.
 */
export function validateAndEncodeResourceId(id: string, resourceType = "Resource"): string {
  validateUUID(id, `${resourceType} ID`)
  return encodeOpenstackPathSegment(id, `${resourceType} ID`)
}
```

**Test file:** `packages/signal-openstack/src/pathHelpers.test.ts`

```typescript
describe("encodeOpenstackPathSegment", () => {
  it("should encode simple strings", () => {
    expect(encodeOpenstackPathSegment("flavor-123")).toBe("flavor-123")
  })

  it("should encode special characters", () => {
    expect(encodeOpenstackPathSegment("my container")).toBe("my%20container")
  })

  it("should reject path traversal (..)", () => {
    expect(() => encodeOpenstackPathSegment("../admin")).toThrow("path traversal")
  })

  it("should reject path traversal (./)", () => {
    expect(() => encodeOpenstackPathSegment("./admin")).toThrow("path traversal")
  })

  it("should reject slashes", () => {
    expect(() => encodeOpenstackPathSegment("admin/secrets")).toThrow("must not contain slashes")
  })
})

describe("validateUUID", () => {
  it("should accept valid UUIDs", () => {
    expect(() => validateUUID("550e8400-e29b-41d4-a716-446655440000")).not.toThrow()
  })

  it("should reject non-UUID strings", () => {
    expect(() => validateUUID("not-a-uuid")).toThrow("must be a UUID")
  })

  it("should reject path traversal attempts", () => {
    expect(() => validateUUID("../admin")).toThrow("must be a UUID")
  })
})
```

---

### Week 2, Day 2-3: Tuesday-Wednesday - Apply Path Encoding

**Affected files (6 files, ~30 call sites):**

1. **Nova Flavors:** `packages/aurora/src/server/Compute/routers/flavorRouter.ts`
2. **Nova Helpers:** `packages/aurora/src/server/Compute/helpers/flavorHelpers.ts`
3. **Neutron Security Groups:** `packages/aurora/src/server/Network/routers/securityGroupRouter.ts`
4. **Neutron Floating IPs:** `packages/aurora/src/server/Network/routers/floatingIpRouter.ts`
5. **PCA:** `packages/aurora/src/server/Services/routers/pcaRouter.ts`
6. **Keystone:** `packages/aurora/src/server/Project/routers/projectRouter.ts`

**Pattern for each fix:**

```typescript
// BEFORE (vulnerable)
const response = await compute.get(`flavors/${flavorId}`)

// AFTER (safe)
import { validateAndEncodeResourceId } from "@signal-openstack/pathHelpers"

const encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
const response = await compute.get(`flavors/${encodedId}`)
```

**Automated refactor script:**

```typescript
// scripts/apply-path-encoding.ts

import { Project } from "ts-morph"

const project = new Project()
project.addSourceFilesAtPaths("packages/aurora/src/server/**/*.ts")

const filesToFix = [
  "packages/aurora/src/server/Compute/routers/flavorRouter.ts",
  "packages/aurora/src/server/Compute/helpers/flavorHelpers.ts",
  // ... add all 6 files
]

filesToFix.forEach((filePath) => {
  const sourceFile = project.getSourceFile(filePath)
  if (!sourceFile) return

  // Add import
  sourceFile.addImportDeclaration({
    moduleSpecifier: "@signal-openstack/pathHelpers",
    namedImports: ["validateAndEncodeResourceId"],
  })

  // Find all template literals with resource IDs
  // This is a simplified example - adjust based on actual patterns
  sourceFile.getDescendantsOfKind(ts.SyntaxKind.TemplateExpression).forEach((template) => {
    // Transform: `flavors/${flavorId}` → `flavors/${validateAndEncodeResourceId(flavorId, "Flavor")}`
    // Implementation depends on specific patterns
  })

  sourceFile.saveSync()
})

console.log("✅ Path encoding applied")
```

**Run:**

```bash
npx tsx scripts/apply-path-encoding.ts
npm run test -- --coverage
```

---

### Week 2, Day 4: Thursday - Secret Redaction

#### Task: Redact Swift Secrets (3 hours)

**File:** `packages/aurora/src/server/helpers/secretHelpers.ts` (NEW)

```typescript
/**
 * Sensitive header names that must never reach browser code.
 */
const REDACTED_HEADERS = [
  "x-auth-token",
  "x-subject-token",
  "x-container-sync-key",
  "x-container-meta-temp-url-key",
  "x-container-meta-temp-url-key-2",
  "x-account-meta-temp-url-key",
  "x-account-meta-temp-url-key-2",
  "authorization",
] as const

/**
 * Check if header contains secret material.
 */
export function isSecretHeader(headerName: string): boolean {
  return REDACTED_HEADERS.includes(headerName.toLowerCase() as any)
}

/**
 * Redact secret headers from Swift metadata response.
 * Returns presence flags instead of secret values.
 */
export function redactSwiftSecrets(headers: Headers): {
  hasTempUrlKey: boolean
  hasSyncKey: boolean
} {
  return {
    hasTempUrlKey:
      headers.has("x-container-meta-temp-url-key") ||
      headers.has("x-container-meta-temp-url-key-2") ||
      headers.has("x-account-meta-temp-url-key") ||
      headers.has("x-account-meta-temp-url-key-2"),
    hasSyncKey: headers.has("x-container-sync-key"),
  }
}
```

**File:** `packages/aurora/src/server/Storage/helpers/swiftHelpers.ts`

```typescript
import { redactSwiftSecrets } from "../../helpers/secretHelpers"

// Find parseContainerInfo function (around line 190)
export function parseContainerInfo(headers: Headers): ContainerInfo {
  const containerInfo: ContainerInfo = {
    // ... existing fields
  }

  // REMOVE these lines (they expose secrets):
  // const syncKey = headers.get("x-container-sync-key")
  // if (syncKey) containerInfo.syncKey = syncKey
  //
  // const tempUrlKey = headers.get("x-container-meta-temp-url-key")
  // if (tempUrlKey) containerInfo.tempUrlKey = tempUrlKey
  //
  // const tempUrlKey2 = headers.get("x-container-meta-temp-url-key-2")
  // if (tempUrlKey2) containerInfo.tempUrlKey2 = tempUrlKey2

  // ADD this instead (returns only presence flags):
  const secrets = redactSwiftSecrets(headers)
  return {
    ...containerInfo,
    ...secrets,
  }
}

// Apply same pattern to parseAccountInfo (around line 110)
export function parseAccountInfo(headers: Headers): AccountInfo {
  const accountInfo: AccountInfo = {
    // ... existing fields
  }

  // Redact secrets
  const secrets = redactSwiftSecrets(headers)
  return {
    ...accountInfo,
    ...secrets,
  }
}
```

**Update TypeScript types:**

```typescript
// packages/aurora/src/server/Storage/types/swift.ts

export interface ContainerInfo {
  // ... existing fields

  // REMOVE:
  // syncKey?: string
  // tempUrlKey?: string
  // tempUrlKey2?: string

  // ADD:
  hasTempUrlKey: boolean
  hasSyncKey: boolean
}

export interface AccountInfo {
  // ... existing fields

  // REMOVE:
  // tempUrlKey?: string
  // tempUrlKey2?: string

  // ADD:
  hasTempUrlKey: boolean
}
```

**Test:**

```typescript
describe("Secret redaction", () => {
  it("should not return raw TempURL keys", async () => {
    const result = await caller.swift.getContainerMetadata({
      project_id: "test",
      container: "test-container",
    })

    expect(result.tempUrlKey).toBeUndefined()
    expect(result.tempUrlKey2).toBeUndefined()
    expect(result.syncKey).toBeUndefined()
  })

  it("should return presence flags", async () => {
    const result = await caller.swift.getContainerMetadata({
      project_id: "test",
      container: "test-container",
    })

    expect(typeof result.hasTempUrlKey).toBe("boolean")
    expect(typeof result.hasSyncKey).toBe("boolean")
  })
})
```

---

### Week 2, Day 5: Friday - TempURL Hardening

#### Task: Cap TempURL Lifetime and Methods (3 hours)

**File:** `packages/aurora/src/server/Storage/types/swift.ts`

```typescript
// Add constants
export const MAX_TEMP_URL_LIFETIME = 3600 // 1 hour (in seconds)
export const DEFAULT_TEMP_URL_LIFETIME = 900 // 15 minutes

// Update schema (around line 363)
export const generateTempUrlInputSchema = baseObjectInputSchema.extend({
  method: z.enum(["GET"]), // CHANGED: Only GET by default
  expiresIn: z
    .number()
    .min(60) // Minimum 1 minute
    .max(MAX_TEMP_URL_LIFETIME) // Maximum 1 hour
    .default(DEFAULT_TEMP_URL_LIFETIME),
  filename: z.string().optional(),
})

// Add separate schema for privileged write TempURLs (if needed)
export const generateWriteTempUrlInputSchema = baseObjectInputSchema.extend({
  method: z.enum(["PUT", "POST", "DELETE"]),
  expiresIn: z
    .number()
    .min(60)
    .max(1800) // Max 30 minutes for write operations
    .default(900),
  filename: z.string().optional(),
  reason: z.string().min(10), // Require explanation
})
```

**File:** `packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts`

```typescript
import { MAX_TEMP_URL_LIFETIME } from "../../types/swift"

// Find generateTempUrl procedure (around line 1210)
generateTempUrl: projectScopedProcedure
  .input(projectScopedInputSchema.extend(generateTempUrlInputSchema.shape))
  .mutation(async ({ input, ctx }): Promise<TempUrl> => {
    return withErrorHandling(async () => {
      const { account, container, object, method, expiresIn, filename } = input

      // Validate expiration
      if (expiresIn > MAX_TEMP_URL_LIFETIME) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `TempURL lifetime exceeds maximum (${MAX_TEMP_URL_LIFETIME} seconds)`,
        })
      }

      // Audit log for monitoring
      ctx.logger?.info("TempURL generated", {
        userId: ctx.openstack?.getToken()?.tokenData.user?.id,
        projectId: ctx.openstack?.getToken()?.tokenData.project?.id,
        container,
        object,
        method,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      })

      // ... rest of existing logic
```

---

### Week 3: Testing & Documentation

**Day 1-2: Comprehensive Testing**
**Day 3: Security Documentation**
**Day 4-5: Code Review & Merge**

---

## Week 4: Session Security

_(Similar detailed breakdown for Findings #6, #7, #8)_

**Goal:** Fix cookie scope, token exposure, CSRF bypass

---

## Week 5-6: Authorization Hardening

_(Similar detailed breakdown for Findings #9, #10, #15, #16)_

**Goal:** Strengthen BFF authorization layer

---

## Development Workflow

### Daily Standup Format

**Time:** 9:00 AM  
**Duration:** 15 minutes

**Each developer reports:**

1. What I completed yesterday
2. What I'm working on today
3. Any blockers

**Example:**

> Yesterday: Fixed Glance pagination validation, added tests  
> Today: Apply validation to Swift account overrides  
> Blockers: Need clarification on Swift account naming convention

---

### Code Review Process

**PR Requirements:**

- [ ] All tests pass (`npm run test`)
- [ ] Test coverage ≥ 90% for new code
- [ ] No TypeScript errors
- [ ] Security checklist completed
- [ ] Documentation updated

**Review checklist:**

```markdown
## Security PR Review Checklist

### Validation

- [ ] Input validation is comprehensive
- [ ] Error messages don't leak sensitive info
- [ ] Edge cases are handled

### Testing

- [ ] Unit tests for all validation functions
- [ ] Integration tests for affected routes
- [ ] Security-specific test cases added

### Breaking Changes

- [ ] No breaking changes to legitimate use cases
- [ ] Migration guide provided (if needed)
- [ ] Backward compatibility maintained

### Documentation

- [ ] CHANGELOG.md updated
- [ ] API documentation updated
- [ ] Security advisory drafted (if customer-facing)
```

**Approval requirements:**

- 2 approvals required for P0 fixes
- 1 approval + security team review for P1-P2 fixes

---

### Git Workflow

```bash
# Feature branch naming
security/[priority]-[finding-number]-[short-description]

# Examples:
security/p0-001-glance-ssrf
security/p1-003-path-traversal
security/p2-006-cookie-scope

# Commit message format
<type>: <short summary>

<detailed description>

Fixes: Finding #<number>
Breaking changes: <yes/no>
Test coverage: <percentage>

# Types: security, fix, feat, refactor, test, docs
```

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \     E2E Tests (5%)
      /----\    - Full user flows
     /      \   - Security scenarios
    /--------\
   / Integration\ (25%)
  /    Tests     \  - API endpoints
 /--------------\ - OpenStack integration
/   Unit Tests   \ (70%)
\  (Validation,  / - Validation functions
 \ Path encoding/ - Path encoding
  \------------/  - Secret redaction
```

### Test Coverage Targets

| Layer       | Minimum | Target | Critical Paths |
| ----------- | ------- | ------ | -------------- |
| Unit        | 80%     | 90%    | 95%            |
| Integration | 70%     | 80%    | 90%            |
| E2E         | 50%     | 60%    | 80%            |

---

### Continuous Testing

**Pre-commit hooks:**

```bash
# .husky/pre-commit
npm run lint
npm run test:changed
npm run type-check
```

**CI Pipeline:**

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:security
      - run: npm run test:integration
      - run: npm audit
```

---

## Deployment Strategy

### Deployment Phases

**Phase 1: Staging (Day 4 of each sprint)**

```bash
# Deploy to staging
git checkout staging
git merge security/[branch-name]
npm run deploy:staging

# Smoke test
npm run test:smoke -- --env=staging
```

**Phase 2: Canary (Day 5, 10% traffic)**

```bash
# Deploy to 10% of production
npm run deploy:canary

# Monitor for 2 hours
npm run monitor:canary

# Rollback criteria:
# - Error rate > 0.5%
# - Latency increase > 20%
# - User complaints
```

**Phase 3: Production (End of week, 100% traffic)**

```bash
# Full production rollout
npm run deploy:production

# Monitor for 24 hours
npm run monitor:production
```

---

### Rollback Procedure

**Automatic rollback triggers:**

- Error rate > 1%
- Latency > 2x baseline
- Failed health checks

**Manual rollback:**

```bash
# Option 1: Revert via CD
npm run rollback:production

# Option 2: Git revert
git revert HEAD
git push origin main

# Option 3: Redeploy previous tag
git checkout v1.2.0
npm run deploy:production
```

---

### Monitoring & Alerts

**Key metrics:**

```javascript
// Grafana Dashboard: Security Remediation

// Panel 1: Error rates by endpoint
sum(rate(http_requests_total{status="400"}[5m])) by (endpoint)

// Panel 2: Validation errors
sum(rate(validation_errors_total[5m])) by (error_type)

// Panel 3: SSRF attempts blocked
sum(rate(ssrf_attempts_blocked_total[5m]))

// Panel 4: Response times
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Alert rules:**

```yaml
# alerts.yml

- alert: HighValidationErrorRate
  expr: rate(validation_errors_total[5m]) > 10
  for: 5m
  annotations:
    summary: "High validation error rate detected"

- alert: SSRFAttempts
  expr: rate(ssrf_attempts_blocked_total[1m]) > 0
  for: 1m
  annotations:
    summary: "SSRF attack attempts detected"
```

---

## Communication Plan

### Internal Communication

**Security sprint kickoff:**

```markdown
Subject: Security Sprint Kickoff - SSRF Remediation

Team,

We're starting a focused security sprint to fix critical SSRF vulnerabilities discovered in our recent security scan.

**Timeline:** Week of [date]
**Priority:** P0 (block other work if needed)
**Goal:** Deploy hotfix by Friday

**What we're fixing:**

- Finding #1: Glance pagination SSRF (token theft)
- Finding #2: Swift account override SSRF (token theft)

**What you need to do:**

1. Review SECURITY_ANALYSIS.md
2. Attend daily standups (9 AM)
3. Review PRs within 4 hours
4. Be available for deployment Friday evening

**Questions:** #security-sprint Slack channel

Thanks,
Security Team
```

---

### Customer Communication (if needed)

**Security advisory template:**

```markdown
# Security Advisory: SSRF Vulnerability Hotfix

**Severity:** High
**Affected versions:** v1.0.0 - v1.2.0
**Fixed in:** v1.2.1
**CVE:** (pending)

## Summary

We've identified and fixed vulnerabilities that could allow authenticated users to leak OpenStack bearer tokens via server-side request forgery (SSRF).

## Impact

Authenticated users could potentially:

- Steal OpenStack authentication tokens
- Access internal network resources via SSRF

## Affected Components

- Image pagination API
- Swift object storage API

## Remediation

**Immediate action required:**

1. Upgrade to v1.2.1 or later
2. Review access logs for suspicious activity
3. Rotate OpenStack credentials if compromise suspected

## Timeline

- 2026-08-01: Vulnerability discovered
- 2026-08-05: Hotfix developed
- 2026-08-09: Hotfix deployed
- 2026-08-12: Public disclosure

## Detection

Look for these patterns in logs:

- Pagination URLs containing `http://` or `https://`
- Swift account names not matching `AUTH_*` format

## Questions

Contact: security@example.com
```

---

### Status Updates

**Weekly update template:**

```markdown
# Security Remediation Status - Week [N]

## Progress This Week

✅ Completed:

- Finding #1: Glance SSRF (deployed to production)
- Finding #2: Swift SSRF (deployed to production)

🚧 In Progress:

- Finding #3: Path traversal fixes (6/12 files complete)

📋 Planned Next Week:

- Complete path traversal fixes
- Secret redaction implementation

## Metrics

- Test coverage: 92% (+5%)
- Security tests: 45 new tests added
- Zero production incidents

## Blockers

None

## Next Steps

1. Complete path encoding for remaining services
2. Begin secret redaction sprint
3. Schedule security training session
```

---

## Success Criteria

### Week 1 (P0 Hotfix)

- [ ] Glance SSRF fixed and deployed
- [ ] Swift SSRF fixed and deployed
- [ ] Zero production incidents
- [ ] Test coverage ≥ 90% for new code

### Week 2-3 (P1 Hardening)

- [ ] All path traversal fixes deployed
- [ ] Swift secrets redacted from responses
- [ ] TempURL lifetime capped and audited
- [ ] Test coverage ≥ 85% overall

### Week 4 (P2 Session Security)

- [ ] Cookie scope default changed
- [ ] `getAuthToken` route removed/hardened
- [ ] CSRF coverage verified
- [ ] Migration guide published

### Week 5-6 (P2 Authorization)

- [ ] EC2 credential IDOR fixed
- [ ] Floating IP ownership verified
- [ ] Upload progress scoped by project
- [ ] Inactivity logout server-side

### Overall Success

- [ ] All 16 findings remediated
- [ ] No regression in legitimate functionality
- [ ] Documentation updated
- [ ] Team trained on secure patterns
- [ ] Security scan re-run shows 0 findings

---

## Resources

### Documentation

- `SECURITY_ANALYSIS.md` - Full scan results
- `SECURITY_IMPLEMENTATION_PLAN.md` - This document
- `CONTRIBUTING.md` - Development guidelines

### Tools

- Jest - Unit testing
- Supertest - Integration testing
- TypeScript - Type safety
- ESLint - Code quality

### Support Channels

- **Slack:** #security-sprint
- **Email:** security-team@example.com
- **Meetings:** Daily standup, 9 AM
- **On-call:** security-oncall@ (PagerDuty)

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-05  
**Next Review:** After Week 1 completion
