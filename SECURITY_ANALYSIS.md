# Security Review Analysis & Prioritization - Aurora Dashboard

**Project:** aurora-dashboard  
**Scan Date:** 2026-08-05  
**Git Revision:** 890f453502ddc44e5bbfdb52ab9f277e49061565  
**Findings:** 16 (2 High, 12 Medium, 2 Low)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Priority Findings (P1-P2)](#high-priority-findings-p1-p2)
3. [Low-Priority Findings (P3)](#low-priority-findings-p3)
4. [Remediation Roadmap](#remediation-roadmap)
5. [Shared Remediation Patterns](#shared-remediation-patterns)
6. [Testing Requirements](#testing-requirements)
7. [Files Requiring Changes](#files-requiring-changes)
8. [Compliance Mapping](#compliance-mapping)

---

## High-Priority Findings (P1-P2)

### 🟡 Finding #6: Session Cookie Parent-Domain Scope

**Severity:** MEDIUM | **Confidence:** HIGH | **CWE:** CWE-614

**Impact:**  
Bearer session cookies default to parent-domain scope (`.example.com`), sharing authentication across sibling subdomains. Compromised or lower-trust sibling subdomains can read/manipulate session cookies.

**Current Behavior:**

```typescript
// packages/aurora/src/server/sessionCookie.ts:31-43
;((crossDomainCookie = true), // ❌ Default enables parent-domain cookies
  function extractCookieDomain(hostname: string, crossDomainCookie: boolean) {
    if (!crossDomainCookie) return undefined

    const parts = hostname.split(".")
    if (parts.length >= 3) {
      return `.${parts.slice(1).join(".")}` // ❌ aurora.example.com → .example.com
    }
  })
```

**Attack Scenario:**

```
Primary: aurora.example.com (dashboard)
Sibling: dev.example.com (untrusted developer instance)
Cookie: Set-Cookie: aurora-session=gAAA...; Domain=.example.com; SameSite=Strict

1. User logs into aurora.example.com
2. Session cookie sent to .example.com (all subdomains)
3. Attacker compromises dev.example.com via XSS
4. Attacker reads aurora-session cookie (HTTP-only but same-origin)
5. Attacker reuses session for aurora.example.com API calls (SameSite allows)
```

**Required Fix:**

```typescript
// 1. Change default to host-only
crossDomainCookie = false, // Host-only by default

// 2. Require explicit configuration for cross-domain
if (process.env.ENABLE_CROSS_DASHBOARD_COOKIE === "true") {
  // Validate allowed sibling domains
  const allowedDomains = process.env.ALLOWED_COOKIE_DOMAINS?.split(",") || []
  if (!allowedDomains.includes(req.hostname)) {
    throw new Error("Hostname not in allowed cookie domains")
  }
  crossDomainCookie = true
}

// 3. Document trust boundary requirement
// SECURITY: Enabling cross-domain cookies shares bearer sessions across
// ALL subdomains under the parent domain. Only enable when all sibling
// subdomains are equally trusted (same security posture, admin team, etc.)
```

**Priority:** P2 - Address in next sprint

---

### 🟡 Finding #7: Raw OpenStack Token Exposure via API

**Severity:** MEDIUM | **Confidence:** HIGH | **CWE:** CWE-200, CWE-522

**Impact:**  
`getAuthToken` route returns raw Keystone bearer token to browser-readable JavaScript, defeating HTTP-only cookie protection.

**Vulnerable Code:**

```typescript
// packages/aurora/src/server/Authentication/routers/sessionRouter.ts:18-20
getAuthToken: protectedProcedure.query(async ({ ctx }) => {
  const token = ctx.openstack?.getToken()
  return token?.authToken || null // ❌ Raw bearer token returned to browser
})

// Frontend can now access token:
const token = await trpcClient.auth.getAuthToken.query()
// token = "gAAAAABh..." (valid OpenStack bearer credential)
```

**Why This Defeats Security:**

- Session cookie is HTTP-only to prevent JavaScript access
- This route intentionally exposes the same credential to JavaScript
- Malicious scripts, XSS, or browser extensions can now steal tokens

**Required Fix:**

```typescript
// Option 1: Remove route entirely (preferred)
// Remove getAuthToken from sessionRouter

// Option 2: Return short-lived BFF-minted token
getAuthToken: protectedProcedure.query(async ({ ctx }) => {
  const bffToken = await mintBFFToken(ctx.user.id, {
    audience: "aurora-bff",
    expiresIn: "5m",
  })
  return bffToken // ❌ Cannot be used directly against OpenStack
})

// Option 3: Add audit trail + explicit user consent
getAuthToken: protectedProcedure
  .input(
    z.object({
      reason: z.string().min(10), // Require explanation
      acceptRisk: z.literal(true), // Explicit consent
    })
  )
  .mutation(async ({ ctx, input }) => {
    logger.warn("Token access", {
      userId: ctx.user.id,
      reason: input.reason,
      ip: ctx.req.ip,
    })
    return ctx.openstack?.getToken()?.authToken
  })
```

**Priority:** P2 - Address in next sprint

---

### 🟡 Finding #8: Direct Upload CSRF Bypass

**Severity:** MEDIUM | **Confidence:** MEDIUM | **CWE:** CWE-352

**Impact:**  
`/upload-image-direct` route registered before CSRF plugin, bypassing CSRF protection for cookie-authenticated state-changing operations.

**Vulnerable Registration Order:**

```typescript
// packages/aurora/src/server/server.ts:76-146
server.post(`${bffEndpoint}/upload-image-direct`, ...) // ❌ Registered BEFORE CSRF

// packages/aurora/src/server/server.ts:148-154
server.register(AuroraFastifyCsrfProtection, { // ❌ CSRF plugin registered AFTER
  tokenRoute: "/csrf-token",
  protectionMethods: ["POST", "PUT", "DELETE"],
})
```

**Attack Scenario:**

```html
<!-- Attacker hosts on same-site sibling subdomain: evil.example.com -->
<form action="https://aurora.example.com/bff/upload-image-direct" method="POST" enctype="multipart/form-data">
  <input name="imageId" value="victim-image-uuid" />
  <input type="file" name="file" />
  <input type="submit" />
</form>
<script>
  // Auto-submit on victim visit (SameSite=Strict allows same-site requests)
  document.forms[0].submit()
</script>
```

**Exploitation Requirements:**

- Attacker controls same-site sibling subdomain (e.g., `evil.example.com`)
- Parent-domain cookies enabled (Finding #6)
- Victim has active session

**Required Fix:**

```typescript
// Option 1: Reorder registration (preferred)
server.register(AuroraFastifyCsrfProtection, { ... }) // Register FIRST

server.post(`${bffEndpoint}/upload-image-direct`, ...) // Register AFTER

// Option 2: Explicit CSRF check in route
server.post(`${bffEndpoint}/upload-image-direct`, async (request, reply) => {
  // Validate CSRF token
  const csrfToken = request.headers["x-csrf-token"]
  if (!csrfToken || !validateCsrfToken(csrfToken, request.session)) {
    return reply.code(403).send({ message: "Invalid CSRF token" })
  }

  // ... existing upload logic
})
```

**Priority:** P2 - Address in next sprint

---

### 🟡 Finding #9: EC2 Credential Deletion IDOR

**Severity:** MEDIUM | **Confidence:** MEDIUM | **CWE:** CWE-639, CWE-862

**Impact:**  
Credential delete accepts arbitrary credential ID without BFF-side ownership verification. Relies solely on downstream Keystone policy.

**Vulnerable Pattern:**

```typescript
// packages/aurora/src/server/Storage/routers/ceph/ec2CredentialRouter.ts:166-176
deleteById: projectScopedProcedure
  .input(z.object({ credentialId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.openstack.getToken()?.tokenData.user?.id
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" })

    // ❌ No ownership verification - forwards arbitrary ID
    await identityService.del(`credentials/${input.credentialId}`)
  })

// Compare with safe list operation:
list: projectScopedProcedure.query(async ({ ctx, input }) => {
  const credentials = await identityService.get("credentials", {
    queryParams: { user_id: userId, type: "ec2" },
  })
  // ✅ Filters by current user and project
  return credentials.filter((c) => c.project_id === input.project_id)
})
```

**Attack Vector:**

```typescript
// 1. List own credentials (returns filtered list)
GET /trpc/ec2Credential.list
Response: [{ id: "my-cred-123", user_id: "user-abc", project_id: "proj-1" }]

// 2. Guess or enumerate other user's credential ID
POST /trpc/ec2Credential.deleteById
{ "credentialId": "other-user-cred-456" }

// Result: BFF forwards DELETE to Keystone without ownership check
// Success depends on Keystone policy (unverified in scan)
```

**Required Fix:**

```typescript
deleteById: projectScopedProcedure
  .input(z.object({ credentialId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.openstack.getToken()?.tokenData.user?.id
    const projectId = ctx.openstack.getToken()?.tokenData.project?.id

    // 1. Resolve credential metadata first
    const credential = await identityService.get(`credentials/${input.credentialId}`).then((res) => res.json())

    // 2. Verify ownership
    if (credential.user_id !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete credential owned by another user",
      })
    }

    if (credential.project_id !== projectId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete credential from another project",
      })
    }

    // 3. Only then delete
    await identityService.del(`credentials/${input.credentialId}`)
  })
```

**Priority:** P2 - Address in next sprint

---

### 🟡 Finding #10: Floating IP Ownership Confusion

**Severity:** MEDIUM | **Confidence:** MEDIUM | **CWE:** CWE-639, CWE-863

**Impact:**  
Floating IP creation forwards caller-selected `tenant_id` and `project_id` to Neutron. BFF should derive ownership from session, not trust client input.

**Vulnerable Code:**

```typescript
// packages/aurora/src/server/Network/routers/floatingIpRouter.ts:70-92
create: projectScopedProcedure
  .input(FloatingIpCreateRequestSchema) // ← Accepts tenant_id, project_id from client
  .mutation(async ({ input, ctx }) => {
    const requestBody = {
      floatingip: {
        tenant_id: input.tenant_id, // ❌ Trusts client input
        project_id: input.project_id, // ❌ Trusts client input
        floating_network_id: input.floating_network_id,
        // ...
      },
    }
    await network.post(FLOATING_IPS_BASE_URL, requestBody)
  })
```

**Attack Vector:**

```typescript
// User authenticated to project-A
// Request creates floating IP in project-B

POST /trpc/floatingIp.create
{
  "tenant_id": "project-B-id",    // ← Attacker-controlled
  "project_id": "project-B-id",   // ← Attacker-controlled
  "floating_network_id": "net-123"
}

// BFF forwards to Neutron with mismatched ownership
// Success depends on Neutron policy (unverified in scan)
```

**Required Fix:**

```typescript
create: projectScopedProcedure
  .input(
    FloatingIpCreateRequestSchema.omit({
      tenant_id: true, // Remove from client input
      project_id: true, // Remove from client input
    })
  )
  .mutation(async ({ input, ctx }) => {
    // Derive ownership from session, not client
    const token = ctx.openstack.getToken()
    const projectId = token?.tokenData.project?.id

    if (!projectId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "No project scope" })
    }

    const requestBody = {
      floatingip: {
        tenant_id: projectId, // ✅ Derived from session
        project_id: projectId, // ✅ Derived from session
        floating_network_id: input.floating_network_id,
        // ... other client-controlled fields
      },
    }
    await network.post(FLOATING_IPS_BASE_URL, requestBody)
  })
```

**Priority:** P2 - Address in next sprint

---

## Low-Priority Findings (P3)

### 🔵 Finding #15: Image Upload Progress Cross-Project Observation

**Severity:** LOW | **Confidence:** MEDIUM | **CWE:** CWE-200, CWE-639

**Impact:**  
Upload progress keyed only by image/upload ID. Predictable IDs enable cross-project metadata leakage (size, timing, status), but not content.

**Vulnerable Code:**

```typescript
// packages/aurora/src/server/Compute/routers/imageRouter.ts:395-413
uploadProgress.set(validatedImageId, {
  // ❌ No project scoping
  uploaded: 0,
  total: validatedFileSize,
})

// Subscription watches by ID only
watchUploadProgress: projectScopedProcedure.input(z.object({ uploadId: z.string() })).subscription(async function* ({
  input,
}) {
  const current = uploadProgress.get(input.uploadId) // ❌ No project check
  yield current
})
```

**Required Fix:**

```typescript
// Scope progress by project + upload ID
const token = ctx.openstack?.getToken()
const projectId = token?.tokenData.project?.id
const scopedUploadId = `${projectId}:${validatedImageId}`

uploadProgress.set(scopedUploadId, { ... })

// Verify ownership in subscription
watchUploadProgress: projectScopedProcedure
  .input(z.object({ uploadId: z.string() }))
  .subscription(async function* ({ input, ctx }) => {
    const projectId = ctx.openstack?.getToken()?.tokenData.project?.id
    const scopedUploadId = `${projectId}:${input.uploadId}`

    const current = uploadProgress.get(scopedUploadId)
    if (current) yield current
  })
```

**Priority:** P3 - Backlog

---

### 🔵 Finding #16: Inactivity Logout Missing Server Invalidation

**Severity:** LOW | **Confidence:** MEDIUM | **CWE:** CWE-613

**Impact:**  
Client-side inactivity logout clears UI state but doesn't invalidate server session. Shared workstation risk: later user can rehydrate session from valid cookie.

**Vulnerable Code:**

```typescript
// packages/aurora/src/client/store/AuthProvider.tsx:59-91
const logout = useCallback(async (reason: "inactive" | "expired" | "manual") => {
  clearLogoutTimer()
  clearInactivityTimer()

  setUser(null) // ❌ Only clears client state
  setExpiresAt(undefined)

  if (reason === "inactive" || reason === "expired") {
    setShowInactivityModal(true) // ❌ No server logout call
  } else {
    router.invalidate() // Only manual logout navigates
  }
})

// Route loaders can rehydrate from cookie
beforeLoad: async ({ context }) => {
  if (!context.auth?.isAuthenticated) {
    const token = await context.trpcClient?.auth.getCurrentUserSession.query()
    if (token) {
      context.auth?.login(token.user, token.expires_at) // ❌ Session restored
    }
  }
}
```

**Required Fix:**

```typescript
const logout = useCallback(async (reason) => {
  clearLogoutTimer()
  clearInactivityTimer()

  // Always invalidate server session first
  try {
    await trpcClient.auth.logout.mutate()
  } catch (err) {
    logger.error("Server logout failed", err)
  }

  // Then clear client state
  setUser(null)
  setExpiresAt(undefined)

  if (reason === "inactive" || reason === "expired") {
    setShowInactivityModal(true)
  } else {
    router.invalidate()
  }
})
```

**Priority:** P3 - Backlog

---

## Remediation Roadmap

### Phase 1: Emergency Hotfix (Week 1) - P0

**Goal:** Eliminate token-bearing SSRF vulnerabilities

**Tasks:**

1. ✅ **Finding #1 (Glance SSRF)**
   - Reject absolute pagination URLs
   - Add `isRelativeUrl()` validation
   - Test with `http://`, `https://`, `//` payloads

2. ✅ **Finding #2 (Swift SSRF)**
   - Validate account names against Swift grammar
   - Add `allowAbsoluteUrl: false` flag to service client
   - Test all 21+ Swift account-override call sites

3. ✅ **Deploy & Verify**
   - Run regression tests
   - Verify OpenStack service calls still succeed
   - Monitor error rates for false positives

**Deliverables:**

- Hotfix branch: `security/ssrf-hotfix`
- Test coverage: ≥90% for new validation logic
- Security advisory draft for customers

---

### Phase 2: Security Hardening (Week 2-3) - P1

**Goal:** Fix path traversal and secret exposure

**Tasks:** 4. ✅ **Finding #3 (Path Traversal Family)**

- Create `encodeOpenstackPathSegment()` helper
- Apply to Nova, Neutron, PCA, Keystone routers
- Add UUID validation for all ID parameters

5. ✅ **Finding #4 (Swift Secret Exposure)**
   - Redact keys from `parseContainerInfo()`
   - Redact keys from `parseAccountInfo()`
   - Return presence flags: `hasTempUrlKey`, `hasSyncKey`

6. ✅ **Finding #5 (TempURL Scope)**
   - Cap lifetime: `MAX_TEMP_URL_LIFETIME = 3600` (1 hour)
   - Default to read-only: `method: z.enum(["GET"])`
   - Require privilege check for `PUT`/`POST`/`DELETE`
   - Add audit logging for URL generation

**Deliverables:**

- Feature branch: `security/hardening-sprint-2`
- Updated security documentation
- Audit log dashboard for TempURL generation

---

### Phase 3: Session Security (Week 4) - P2

**Goal:** Harden session management

**Tasks:** 7. ✅ **Finding #6 (Cookie Scope)**

- Change default: `crossDomainCookie = false`
- Add allowlist validation for cross-domain mode
- Document same-site trust boundary requirement

8. ✅ **Finding #7 (Token Exposure)**
   - Remove `getAuthToken` route (preferred)
   - OR: Return short-lived BFF-minted token
   - Add deprecation notice if keeping

9. ✅ **Finding #8 (CSRF Bypass)**
   - Register CSRF plugin BEFORE upload route
   - Add regression test for CSRF coverage
   - Verify SameSite cookie behavior

**Deliverables:**

- Feature branch: `security/session-hardening`
- Migration guide for cross-domain deployments
- Session security best practices doc

---

### Phase 4: Authorization Hardening (Week 5-6) - P2

**Goal:** Strengthen BFF authorization layer

**Tasks:** 10. ✅ **Finding #9 (EC2 IDOR)** - Add ownership verification before delete - Resolve credential → verify `user_id` + `project_id` - Apply pattern to other credential operations

11. ✅ **Finding #10 (Floating IP Confusion)**
    - Remove `tenant_id`/`project_id` from client input
    - Derive ownership from session token
    - Apply pattern to other resource creation routes

12. ✅ **Finding #15 (Upload Progress Scoping)**
    - Key progress by `${projectId}:${uploadId}`
    - Verify ownership in subscription handler

13. ✅ **Finding #16 (Inactivity Logout)**
    - Call server logout mutation for all logout reasons
    - Add server-side session cleanup
    - Test session invalidation flow

**Deliverables:**

- Feature branch: `security/authz-hardening`
- BFF authorization design doc
- Updated authorization middleware

---

## Shared Remediation Patterns

### Pattern 1: Centralized Path Encoding

**File:** `packages/signal-openstack/src/pathHelpers.ts`

```typescript
/**
 * Encode a single OpenStack path segment, rejecting path syntax characters.
 * Use for resource IDs, container names, object names, etc.
 *
 * @throws {Error} If segment contains path traversal characters
 */
export function encodeOpenstackPathSegment(segment: string): string {
  if (!segment || typeof segment !== "string") {
    throw new Error("Path segment must be a non-empty string")
  }

  // Reject path traversal and URL syntax
  if (/[\/\.\?#]/.test(segment)) {
    throw new Error("Path segment contains invalid characters")
  }

  return encodeURIComponent(segment)
}

/**
 * Encode multiple path segments and join with slashes.
 *
 * @example
 * encodeOpenstackPath("flavors", flavorId, "os-extra_specs")
 * // → "flavors/abc-123/os-extra_specs"
 */
export function encodeOpenstackPath(...segments: string[]): string {
  return segments.map(encodeOpenstackPathSegment).join("/")
}

/**
 * Validate UUID format (common OpenStack identifier pattern).
 */
export function validateUUID(id: string, label = "ID"): void {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${label}: must be a UUID`,
    })
  }
}
```

**Usage:**

```typescript
// Before (vulnerable)
const response = await compute.get(`flavors/${flavorId}`)

// After (safe)
validateUUID(flavorId, "Flavor ID")
const response = await compute.get(encodeOpenstackPath("flavors", flavorId))
```

---

### Pattern 2: Absolute URL Rejection in Service Client

**File:** `packages/signal-openstack/src/client.ts`

```typescript
interface BuildRequestUrlOptions {
  base?: string
  path?: string
  searchParams?: string
  allowAbsoluteUrl?: boolean // Explicit opt-in for trusted absolute URLs
}

const buildRequestUrl = function ({
  base,
  path,
  searchParams,
  allowAbsoluteUrl = false, // Default: reject absolute URLs
}: BuildRequestUrlOptions): URL {
  // Reject absolute URLs unless explicitly allowed
  if (path?.startsWith("http")) {
    if (!allowAbsoluteUrl) {
      throw new SignalOpenstackError(
        "Absolute URLs rejected for security. Use relative paths or set allowAbsoluteUrl=true."
      )
    }
    return new URL(path)
  }

  // Build relative URL
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
```

**Usage:**

```typescript
// Pagination URLs from OpenStack responses (trusted)
const nextPageUrl = response.json().next
const nextPage = await glance.get(nextPageUrl, {
  allowAbsoluteUrl: true, // Explicit trust
})

// User-controlled input (untrusted) - will throw if absolute
const userInput = input.first
const page = await glance.get(userInput) // No allowAbsoluteUrl flag
```

---

### Pattern 3: Project Ownership Binding Helper

**File:** `packages/aurora/src/server/helpers/authHelpers.ts`

```typescript
/**
 * Derive project ownership fields from session token.
 * Use for resource creation to ensure ownership matches session scope.
 *
 * @throws {TRPCError} If session has no project scope
 */
export function bindProjectOwnership(ctx: Context): ProjectScopedFields {
  const token = ctx.openstack?.getToken()
  const projectId = token?.tokenData.project?.id

  if (!projectId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No project scope in session",
    })
  }

  return {
    project_id: projectId,
    tenant_id: projectId, // OpenStack legacy field
  }
}

/**
 * Verify resource ownership matches session scope.
 * Use before update/delete operations.
 *
 * @throws {TRPCError} If ownership mismatch
 */
export function verifyResourceOwnership(ctx: Context, resource: { project_id?: string; user_id?: string }): void {
  const token = ctx.openstack?.getToken()
  const sessionProjectId = token?.tokenData.project?.id
  const sessionUserId = token?.tokenData.user?.id

  if (resource.project_id && resource.project_id !== sessionProjectId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resource belongs to another project",
    })
  }

  if (resource.user_id && resource.user_id !== sessionUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resource belongs to another user",
    })
  }
}
```

**Usage:**

```typescript
// Resource creation - derive ownership from session
create: projectScopedProcedure
  .input(FloatingIpCreateRequestSchema.omit({ project_id: true, tenant_id: true }))
  .mutation(async ({ input, ctx }) => {
    const ownership = bindProjectOwnership(ctx) // ✅ Safe

    const requestBody = {
      floatingip: {
        ...ownership, // project_id, tenant_id from session
        ...input, // Other client-controlled fields
      },
    }
    await network.post(FLOATING_IPS_BASE_URL, requestBody)
  })

// Resource deletion - verify ownership first
deleteById: projectScopedProcedure.input(z.object({ credentialId: z.string() })).mutation(async ({ input, ctx }) => {
  const credential = await resolveCredential(input.credentialId)
  verifyResourceOwnership(ctx, credential) // ✅ Throws if mismatch

  await identityService.del(`credentials/${input.credentialId}`)
})
```

---

### Pattern 4: Secret Redaction Helper

**File:** `packages/aurora/src/server/helpers/secretHelpers.ts`

```typescript
/**
 * Sensitive header names that should never be returned to clients.
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
]

/**
 * Check if a header value should be redacted.
 */
function isSecretHeader(headerName: string): boolean {
  return REDACTED_HEADERS.includes(headerName.toLowerCase())
}

/**
 * Redact secret headers, returning only presence flags.
 *
 * @example
 * const redacted = redactSecretHeaders(response.headers)
 * // Input:  { "x-container-meta-temp-url-key": "secret123" }
 * // Output: { "hasTempUrlKey": true }
 */
export function redactSecretHeaders(headers: Headers): Record<string, boolean> {
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

**Usage:**

```typescript
// Before (vulnerable)
export function parseContainerInfo(headers: Headers): ContainerInfo {
  const info: ContainerInfo = {/* ... */}

  const syncKey = headers.get("x-container-sync-key")
  if (syncKey) info.syncKey = syncKey // ❌ Secret returned

  return info
}

// After (safe)
export function parseContainerInfo(headers: Headers): ContainerInfo {
  const info: ContainerInfo = {/* ... */}

  // Return only presence flags, not secret values
  const secrets = redactSecretHeaders(headers)
  return { ...info, ...secrets } // ✅ { hasSyncKey: true }
}
```

---

## Testing Requirements

### Test Structure for Each Finding

```typescript
describe("Security Fix: [Finding Title]", () => {
  describe("Malicious input rejection", () => {
    it("should reject [specific attack vector]", async () => {
      const maliciousInput = {/* ... */}
      await expect(caller.router.procedure(maliciousInput)).rejects.toThrow("Expected error message")
    })

    it("should not make OpenStack service calls for rejected input", async () => {
      const serviceSpy = jest.spyOn(mockService, "get")

      try {
        await caller.router.procedure(maliciousInput)
      } catch (err) {
        // Expected to throw
      }

      expect(serviceSpy).not.toHaveBeenCalled()
    })
  })

  describe("Valid input acceptance", () => {
    it("should accept valid input", async () => {
      const validInput = {/* ... */}
      const result = await caller.router.procedure(validInput)
      expect(result).toBeDefined()
    })

    it("should encode path segments correctly", async () => {
      const serviceSpy = jest.spyOn(mockService, "get")

      await caller.router.procedure({ id: "test-123" })

      expect(serviceSpy).toHaveBeenCalledWith(
        expect.stringContaining("test-123"), // Encoded form
        expect.any(Object)
      )
    })
  })

  describe("Edge cases", () => {
    it("should handle empty string", async () => {
      await expect(caller.router.procedure({ id: "" })).rejects.toThrow()
    })

    it("should handle special characters", async () => {
      await expect(caller.router.procedure({ id: "../admin" })).rejects.toThrow()
    })
  })
})
```

### Test Coverage Requirements

| Finding Category               | Minimum Coverage | Test Types             |
| ------------------------------ | ---------------- | ---------------------- |
| SSRF (Findings #1, #2)         | 95%              | Unit, Integration, E2E |
| Path Traversal (#3)            | 90%              | Unit, Integration      |
| Secret Exposure (#4, #7)       | 95%              | Unit                   |
| Authorization (#9, #10)        | 90%              | Unit, Integration      |
| Session Security (#6, #8, #16) | 85%              | Integration, E2E       |
| Other Findings                 | 80%              | Unit                   |

### Example Test Cases by Finding

#### Finding #1: Glance SSRF

```typescript
describe("Glance pagination SSRF prevention", () => {
  it("should reject absolute HTTP URLs in first parameter", async () => {
    await expect(caller.image.listPaginated({ first: "http://attacker.com" })).rejects.toThrow("Invalid pagination URL")
  })

  it("should reject absolute HTTPS URLs in next parameter", async () => {
    await expect(caller.image.listPaginated({ next: "https://attacker.com" })).rejects.toThrow("Invalid pagination URL")
  })

  it("should reject protocol-relative URLs", async () => {
    await expect(caller.image.listPaginated({ first: "//attacker.com" })).rejects.toThrow("Invalid pagination URL")
  })

  it("should accept relative pagination URLs", async () => {
    const result = await caller.image.listPaginated({
      first: "v2/images?marker=abc",
    })
    expect(result.images).toBeDefined()
  })

  it("should not call Glance service for rejected URLs", async () => {
    const glanceSpy = jest.spyOn(mockGlance, "get")

    try {
      await caller.image.listPaginated({ first: "http://evil.com" })
    } catch (err) {}

    expect(glanceSpy).not.toHaveBeenCalled()
  })
})
```

#### Finding #2: Swift SSRF

```typescript
describe("Swift account override SSRF prevention", () => {
  const maliciousAccounts = [
    "http://attacker.com",
    "https://attacker.com",
    "//attacker.com",
    "AUTH_abc/../admin",
    "AUTH_abc/../../etc/passwd",
  ]

  maliciousAccounts.forEach((account) => {
    it(`should reject account: ${account}`, async () => {
      await expect(caller.swift.listContainers({ account })).rejects.toThrow("Invalid account name")
    })
  })

  it("should accept valid Swift account names", async () => {
    const validAccount = "AUTH_abc123-test"
    const result = await caller.swift.listContainers({
      account: validAccount,
    })
    expect(result).toBeDefined()
  })
})
```

#### Finding #4: Secret Exposure

```typescript
describe("Swift secret key redaction", () => {
  it("should not return raw TempURL keys in container metadata", async () => {
    const result = await caller.swift.getContainerMetadata({
      container: "test",
    })

    expect(result.tempUrlKey).toBeUndefined()
    expect(result.tempUrlKey2).toBeUndefined()
    expect(result.syncKey).toBeUndefined()
  })

  it("should return presence flags instead of keys", async () => {
    const result = await caller.swift.getContainerMetadata({
      container: "test",
    })

    expect(result.hasTempUrlKey).toBe(true)
    expect(result.hasSyncKey).toBe(false)
  })
})
```

---

## Files Requiring Changes

### Critical (P0) - 4 files

```
packages/signal-openstack/src/client.ts
  └─ Add allowAbsoluteUrl flag + rejection logic

packages/aurora/src/server/Compute/routers/imageRouter.ts
  └─ Add pagination URL validation

packages/aurora/src/server/Storage/types/swift.ts
  └─ Add Swift account name validation

packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts
  └─ Apply account validation to all 21+ Swift procedures
```

### High Priority (P1) - 12 files

```
packages/signal-openstack/src/pathHelpers.ts (NEW)
  └─ Centralized path encoding utilities

packages/aurora/src/server/Compute/routers/flavorRouter.ts
  └─ Apply path encoding to flavor IDs

packages/aurora/src/server/Compute/helpers/flavorHelpers.ts
  └─ Apply path encoding to extra-spec keys

packages/aurora/src/server/Network/routers/securityGroupRouter.ts
  └─ Apply path encoding to security group IDs

packages/aurora/src/server/Network/routers/floatingIpRouter.ts
  └─ Apply path encoding to floating IP IDs

packages/aurora/src/server/Services/routers/pcaRouter.ts
  └─ Apply path encoding to PCA certificate IDs

packages/aurora/src/server/Project/routers/projectRouter.ts
  └─ Apply path encoding to project IDs

packages/aurora/src/server/Storage/helpers/swiftHelpers.ts
  └─ Redact secret keys in parseContainerInfo/parseAccountInfo

packages/aurora/src/server/Storage/types/swift.ts
  └─ Cap TempURL lifetime, restrict methods

packages/aurora/src/server/Storage/routers/swift/swiftRouter.ts
  └─ Add privilege check for mutating TempURLs
```

### Medium Priority (P2) - 8 files

```
packages/aurora/src/server/sessionCookie.ts
  └─ Change crossDomainCookie default to false

packages/aurora/src/server/Authentication/routers/sessionRouter.ts
  └─ Remove getAuthToken route OR return BFF token

packages/aurora/src/server/server.ts
  └─ Reorder CSRF plugin registration

packages/aurora/src/server/helpers/authHelpers.ts (NEW)
  └─ Project ownership binding utilities

packages/aurora/src/server/Storage/routers/ceph/ec2CredentialRouter.ts
  └─ Add ownership verification before delete

packages/aurora/src/server/Network/types/floatingIp.ts
  └─ Remove tenant_id/project_id from create input

packages/aurora/src/server/Network/routers/floatingIpRouter.ts
  └─ Derive ownership from session

packages/aurora/src/server/helpers/secretHelpers.ts (NEW)
  └─ Secret redaction utilities
```

### Low Priority (P3) - 3 files

```
packages/aurora/src/server/Compute/routers/imageRouter.ts
  └─ Scope upload progress by project + ID

packages/aurora/src/client/store/AuthProvider.tsx
  └─ Call server logout for all logout reasons

packages/aurora/src/client/routes/_auth.tsx
  └─ No changes (session rehydration is correct after server invalidation)
```

---

## Compliance Mapping

### CWE (Common Weakness Enumeration)

| CWE         | Category                             | Findings                  | Severity   |
| ----------- | ------------------------------------ | ------------------------- | ---------- |
| **CWE-918** | Server-Side Request Forgery          | #1, #2                    | HIGH       |
| **CWE-22**  | Path Traversal                       | #3                        | MEDIUM     |
| **CWE-200** | Information Disclosure               | #4, #6, #7, #9, #15       | MEDIUM/LOW |
| **CWE-522** | Insufficiently Protected Credentials | #4, #7                    | MEDIUM     |
| **CWE-639** | Authorization Bypass                 | #5, #7, #9, #10, #12, #15 | MEDIUM/LOW |
| **CWE-284** | Improper Access Control              | #5                        | MEDIUM     |
| **CWE-863** | Incorrect Authorization              | #10                       | MEDIUM     |
| **CWE-352** | Cross-Site Request Forgery           | #8                        | MEDIUM     |
| **CWE-614** | Sensitive Cookie without Secure Flag | #6                        | MEDIUM     |
| **CWE-862** | Missing Authorization                | #9                        | MEDIUM     |
| **CWE-613** | Insufficient Session Expiration      | #16                       | LOW        |

### OWASP Top 10 (2021)

| Category                                                  | Findings                  | Risk Level |
| --------------------------------------------------------- | ------------------------- | ---------- |
| **A01:2021 - Broken Access Control**                      | #5, #7, #9, #10, #12, #15 | HIGH       |
| **A07:2021 - Identification and Authentication Failures** | #6, #7, #8, #16           | HIGH       |
| **A10:2021 - Server-Side Request Forgery**                | #1, #2                    | CRITICAL   |
| **A01:2021 - Injection** (Path Traversal)                 | #3                        | MEDIUM     |
| **A02:2021 - Cryptographic Failures**                     | #4, #7                    | MEDIUM     |

### Regulatory Requirements

#### SOC 2 Type II

- **CC6.1** (Logical Access) - Findings #6, #7, #8, #16
- **CC6.6** (Encryption Keys) - Findings #4, #7
- **CC7.2** (System Monitoring) - Finding #5 (audit logging)

#### PCI DSS 4.0

- **Requirement 6.5.1** (Injection Flaws) - Finding #3
- **Requirement 6.5.10** (Broken Authentication) - Findings #6, #7, #8
- **Requirement 8.2** (User Authentication) - Finding #16

#### ISO 27001:2022

- **A.9.2.1** (User Registration) - Findings #9, #10
- **A.9.4.1** (Access Control) - Findings #5, #7, #12
- **A.10.1.1** (Cryptographic Controls) - Finding #4

---

## Open Questions for Team

### Technical Validation

1. **Keystone Token Scope** (Affects Finding #1, #2 severity)
   - Are Keystone tokens audience-bound to specific services?
   - Can a Glance token be replayed against Nova/Neutron/Swift?
   - Test: Capture token from Glance request, attempt replay against Swift

2. **OpenStack Policy Verification** (Affects Finding #3, #9, #10 exploitability)
   - Does Keystone policy allow project users to delete arbitrary EC2 credentials?
   - Does Neutron policy reject floating IPs with mismatched project_id?
   - Test: Staging environment policy audit

3. **Path Traversal Impact** (Affects Finding #3 severity)
   - Can Nova/Neutron/PCA path confusion reach privileged endpoints?
   - What endpoints exist under each service catalog?
   - Test: Map service API surfaces, attempt traversal payloads

### Deployment & Operations

4. **Cookie Scope Usage** (Affects Finding #6 remediation)
   - Are there legitimate production use cases for parent-domain cookies?
   - Which deployments use cross-dashboard cookie sharing?
   - Test: Survey production configs, identify impacted deployments

5. **Token Exposure Consumers** (Affects Finding #7 remediation)
   - Do any production clients actually call `getAuthToken`?
   - Are there browser extensions or integrations that depend on it?
   - Test: Audit production access logs, grep frontend codebase

6. **TempURL Requirements** (Affects Finding #5 remediation)
   - Are mutating TempURLs (`PUT`, `DELETE`) required for any workflows?
   - What are typical TempURL lifetimes in production?
   - Test: Audit TempURL usage patterns, interview product team

### Security Posture

7. **Sibling Subdomain Trust** (Affects Finding #6, #8 severity)
   - Are there untrusted sibling subdomains under the same parent?
   - Is `dev.example.com` equally trusted as `aurora.example.com`?
   - Test: Enumerate all subdomains, assess trust boundaries

8. **SSRF Network Reach** (Affects Finding #1, #2 severity)
   - Can the BFF reach internal metadata services (169.254.169.254)?
   - Can the BFF reach internal admin networks?
   - Test: Attempt SSRF to localhost, private IPs, metadata endpoints

---

## Appendix: Scan Metadata

**Scan Tool:** Codex Security  
**Scan Mode:** deep_repository  
**Static Validation:** Local Node.js checks for URL normalization, regex behavior  
**Live Services:** Not available - OpenStack policy checks unverified  
**Coverage:** Complete (all tRPC routers, authentication, session, OpenStack client)

**Canonical Artifacts:**

- `scan-manifest.json` - Scan configuration and metadata
- `findings.json` - Structured findings data
- `coverage.json` - Code coverage analysis
- `artifacts/05_findings/` - Per-finding ledgers and validation reports

**Validation Approach:**

- Source trace: Schema → route → helper → service client → fetch
- Local runtime checks: URL.pathname normalization, regex matching
- Dataflow analysis: User input → transformation → sink
- Reachability analysis: Authentication requirements, procedure scoping

**Limitations:**

- No live OpenStack deployment for end-to-end reproduction
- Downstream service policy behavior unverified (Keystone, Nova, Neutron, Swift)
- Severity for path confusion findings assumes permissive OpenStack policy
- Token audience binding unverified (affects SSRF token replay risk)

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-05  
**Next Review:** After Phase 1 hotfix deployment
