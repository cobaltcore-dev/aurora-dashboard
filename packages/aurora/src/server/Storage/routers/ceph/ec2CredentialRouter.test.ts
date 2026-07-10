import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { ec2CredentialRouter } from "./ec2CredentialRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import {
  createMockContext as createBaseMockContext,
  TEST_PROJECT_ID,
  TEST_USER_ID,
  TEST_ACCESS,
  TEST_SECRET,
} from "./mockContext"

// ============================================================================
// MOCK DATA
// ============================================================================

const TEST_CREDENTIAL_ID = "cred-abc-123"

const mockBlob = JSON.stringify({ access: TEST_ACCESS, secret: TEST_SECRET })

const rawCredential = {
  id: TEST_CREDENTIAL_ID,
  type: "ec2",
  project_id: TEST_PROJECT_ID,
  user_id: TEST_USER_ID,
  blob: mockBlob,
}

// ============================================================================
// MOCK CONTEXT
// ============================================================================

const createMockContext = (shouldFailAuth = false) => {
  const ctx = createBaseMockContext({ shouldFailAuth })

  // Override mockIdentity with ec2Credential-specific methods
  ctx.mockIdentity.get = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ credentials: [rawCredential] }),
  })
  ctx.mockIdentity.post = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ credential: rawCredential }),
  })
  ctx.mockIdentity.del = vi.fn().mockResolvedValue({ ok: true, status: 204 })

  return ctx
}

const createCaller = createCallerFactory(auroraRouter({ storage: { s3: { ec2Credentials: ec2CredentialRouter } } }))

// ============================================================================
// ec2Credentials.list
// ============================================================================

describe("ec2Credentials.list", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns EC2 credentials filtered by project, without secret", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual([
      {
        id: TEST_CREDENTIAL_ID,
        access: TEST_ACCESS,
        user_id: TEST_USER_ID,
        project_id: TEST_PROJECT_ID,
      },
    ])
    expect(result[0]).not.toHaveProperty("secret")
  })

  it("returns empty array when no EC2 credentials exist", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ credentials: [] }),
    })
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual([])
  })

  it("filters out credentials from other projects", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [rawCredential, { ...rawCredential, id: "other-cred", project_id: "other-project" }],
      }),
    })
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(TEST_CREDENTIAL_ID)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: expect.any(String) })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when identity API returns non-ok", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(TRPCError)
  })

  it("throws INTERNAL_SERVER_ERROR when credential blob is invalid JSON", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [{ ...rawCredential, blob: "invalid-json{" }],
      }),
    })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Failed to parse EC2 credential blob"),
    })
  })

  it("throws INTERNAL_SERVER_ERROR when credential blob is missing required fields", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [{ ...rawCredential, blob: JSON.stringify({ secret: "only-secret" }) }],
      }),
    })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.list({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Invalid EC2 credential format"),
    })
  })
})

// ============================================================================
// ec2Credentials.create
// ============================================================================

describe("ec2Credentials.create", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns new credential including secret key", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual({
      id: TEST_CREDENTIAL_ID,
      access: TEST_ACCESS,
      secret: TEST_SECRET,
      user_id: TEST_USER_ID,
      project_id: TEST_PROJECT_ID,
    })
  })

  it("calls POST with correct structure (access/secret generated locally)", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

    expect(ctx.mockIdentity.post).toHaveBeenCalledWith("credentials", expect.stringContaining('"type":"ec2"'))
    const [, body] = (ctx.mockIdentity.post as ReturnType<typeof vi.fn>).mock.calls[0]
    const parsed = JSON.parse(body)
    expect(parsed.credential.type).toBe("ec2")
    expect(parsed.credential.project_id).toBe(TEST_PROJECT_ID)
    expect(parsed.credential.user_id).toBe(TEST_USER_ID)
    const blob = JSON.parse(parsed.credential.blob)
    expect(typeof blob.access).toBe("string")
    expect(typeof blob.secret).toBe("string")
    expect(blob.access.length).toBeGreaterThan(0)
    expect(blob.secret.length).toBeGreaterThan(0)
  })

  it("throws INTERNAL_SERVER_ERROR when creation fails", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.post as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toThrow(TRPCError)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED", message: expect.any(String) })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when created credential blob is invalid JSON", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credential: { ...rawCredential, blob: "invalid-json{" },
      }),
    })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Failed to parse created credential response"),
    })
  })

  it("throws INTERNAL_SERVER_ERROR when created credential blob is missing secret", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credential: { ...rawCredential, blob: JSON.stringify({ access: TEST_ACCESS }) },
      }),
    })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Created credential has invalid format"),
    })
  })
})

// ============================================================================
// ec2Credentials.delete
// ============================================================================

describe("ec2Credentials.delete", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns success on deletion", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({ success: true })
  })

  it("calls DELETE with correct path", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(ctx.mockIdentity.del).toHaveBeenCalledWith(`credentials/${TEST_CREDENTIAL_ID}`)
  })

  it("returns success when credential is already gone (404)", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 })
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({ success: true })
  })

  it("throws INTERNAL_SERVER_ERROR on non-404 failure", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({
        project_id: TEST_PROJECT_ID,
        credentialId: TEST_CREDENTIAL_ID,
      })
    ).rejects.toThrow(TRPCError)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({
        project_id: TEST_PROJECT_ID,
        credentialId: TEST_CREDENTIAL_ID,
      })
    ).rejects.toThrow(expect.objectContaining({ code: "UNAUTHORIZED", message: expect.any(String) }))
  })
})
