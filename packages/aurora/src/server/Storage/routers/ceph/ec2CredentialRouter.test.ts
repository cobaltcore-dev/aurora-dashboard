import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { ec2CredentialRouter } from "./ec2CredentialRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { EC2_CREDENTIAL_LIMIT_REACHED } from "../../constants"
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
  ctx.mockIdentity.get = vi.fn().mockImplementation((path: string) => {
    // Handle credential list endpoint
    if (path === "credentials") {
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ credentials: [rawCredential] }),
      })
    }
    // Handle single credential fetch for ownership verification
    if (path.startsWith("credentials/")) {
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ credential: rawCredential }),
      })
    }
    return Promise.resolve({ ok: false, status: 404 })
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
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
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
// ec2Credentials.reveal
// ============================================================================

describe("ec2Credentials.reveal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns the credential including its secret for the owner", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.reveal({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({
      id: TEST_CREDENTIAL_ID,
      access: TEST_ACCESS,
      secret: TEST_SECRET,
      user_id: TEST_USER_ID,
      project_id: TEST_PROJECT_ID,
    })
  })

  it("does not call del", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.s3.ec2Credentials.reveal({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  it("throws NOT_FOUND when credential belongs to another user", async () => {
    const ctx = createMockContext()
    const otherUserCredential = { ...rawCredential, user_id: "other-user-id" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ credential: otherUserCredential }) })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Credential not found" }))
  })

  it("throws NOT_FOUND when credential belongs to another project", async () => {
    const ctx = createMockContext()
    const otherProjectCredential = { ...rawCredential, project_id: "other-project-id" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ credential: otherProjectCredential }) })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Credential not found" }))
  })

  it("throws NOT_FOUND on 404 from Keystone", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404 })
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Credential not found" }))
  })

  // signal-openstack rejects on any non-2xx rather than resolving with `ok: false`
  // (packages/signal-openstack/src/client.ts), so this is the shape a real Keystone 404 has.
  it("throws NOT_FOUND when the identity service rejects with a 404", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Could not find credential", 404)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Credential not found" }))
  })

  it("propagates a non-404 rejection from the identity service", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Keystone exploded", 500)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow()
  })

  it("throws NOT_FOUND when the credential is not an EC2 one", async () => {
    const ctx = createMockContext()
    const certCredential = { ...rawCredential, type: "cert" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ credential: certCredential }) })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Credential not found" }))
  })

  it("throws UNAUTHORIZED on 401 from Keystone", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 401 })
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "Authentication failed" }))
  })

  it("throws FORBIDDEN on 403 from Keystone", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 403 })
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Access denied" }))
  })

  it("throws INTERNAL_SERVER_ERROR when the credential blob is invalid JSON", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ credential: { ...rawCredential, blob: "invalid-json{" } }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Failed to parse EC2 credential blob"),
    })
  })

  it("throws UNAUTHORIZED when the session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
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
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
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
      message: expect.stringContaining("Failed to parse EC2 credential blob"),
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
      message: expect.stringContaining("Invalid EC2 credential format"),
    })
  })

  describe("per-project credential limit", () => {
    const mockExistingCredentials = (
      ctx: ReturnType<typeof createMockContext>,
      credentials: Array<typeof rawCredential>
    ) => {
      ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === "credentials") {
          return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ credentials }) })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })
    }

    it("creates when zero credentials exist yet", async () => {
      const ctx = createMockContext()
      mockExistingCredentials(ctx, [])
      const caller = createCaller(ctx)

      await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

      expect(ctx.mockIdentity.post).toHaveBeenCalled()
    })

    it("creates when one credential already exists", async () => {
      const ctx = createMockContext()
      mockExistingCredentials(ctx, [rawCredential])
      const caller = createCaller(ctx)

      await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

      expect(ctx.mockIdentity.post).toHaveBeenCalled()
    })

    it("throws CONFLICT/EC2_CREDENTIAL_LIMIT_REACHED when two credentials already exist, without calling post", async () => {
      const ctx = createMockContext()
      mockExistingCredentials(ctx, [rawCredential, { ...rawCredential, id: "cred-2" }])
      const caller = createCaller(ctx)

      await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
        code: "CONFLICT",
        message: EC2_CREDENTIAL_LIMIT_REACHED,
      })
      expect(ctx.mockIdentity.post).not.toHaveBeenCalled()
    })

    it("does not count credentials belonging to other projects toward the limit", async () => {
      const ctx = createMockContext()
      mockExistingCredentials(ctx, [
        { ...rawCredential, id: "other-cred-1", project_id: "other-project" },
        { ...rawCredential, id: "other-cred-2", project_id: "other-project" },
      ])
      const caller = createCaller(ctx)

      await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

      expect(ctx.mockIdentity.post).toHaveBeenCalled()
    })

    it("throws INTERNAL_SERVER_ERROR when the pre-check listing fails, without calling post", async () => {
      const ctx = createMockContext()
      ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
        if (path === "credentials") {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })
      const caller = createCaller(ctx)

      await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      })
      expect(ctx.mockIdentity.post).not.toHaveBeenCalled()
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

  // The real failure shape: a 404 arrives as a rejection, not as `ok: false`. Without handling
  // it here the documented idempotency of delete would surface as NOT_FOUND instead of success.
  it("returns success when the ownership fetch rejects with a 404", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Could not find credential", 404)
    )
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({ success: true })
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  it("returns success when the credential disappears between the check and the delete", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Could not find credential", 404)
    )
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({ success: true })
  })

  it("propagates a non-404 rejection from the delete call", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Keystone exploded", 500)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow()
  })

  it("does not delete a credential of another type", async () => {
    const ctx = createMockContext()
    const certCredential = { ...rawCredential, type: "cert" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ credential: certCredential }) })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    expect(result).toEqual({ success: true })
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
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
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })

  it("verifies credential ownership before deletion", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    // Should fetch credential first to verify ownership, then delete
    expect(ctx.mockIdentity.get).toHaveBeenCalledWith(`credentials/${TEST_CREDENTIAL_ID}`)
    expect(ctx.mockIdentity.del).toHaveBeenCalledWith(`credentials/${TEST_CREDENTIAL_ID}`)
  })

  it("throws NOT_FOUND when credential belongs to another user", async () => {
    const ctx = createMockContext()
    const otherUserCredential = { ...rawCredential, user_id: "other-user-id" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ credential: otherUserCredential }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({
        project_id: TEST_PROJECT_ID,
        credentialId: TEST_CREDENTIAL_ID,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "Credential not found",
      })
    )

    // Should not attempt delete for unauthorized credential
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  it("throws NOT_FOUND when credential belongs to another project", async () => {
    const ctx = createMockContext()
    const otherProjectCredential = { ...rawCredential, project_id: "other-project-id" }
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ credential: otherProjectCredential }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({
        project_id: TEST_PROJECT_ID,
        credentialId: TEST_CREDENTIAL_ID,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "Credential not found",
      })
    )

    // Should not attempt delete for unauthorized credential
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  it("throws NOT_FOUND when credential does not exist", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === `credentials/${TEST_CREDENTIAL_ID}`) {
        return Promise.resolve({ ok: false, status: 404 })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.delete({
      project_id: TEST_PROJECT_ID,
      credentialId: TEST_CREDENTIAL_ID,
    })

    // Idempotent: 404 on GET returns success without calling DELETE
    expect(result).toEqual({ success: true })
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  it("throws UNAUTHORIZED when project ID is missing from token", async () => {
    const ctx = createMockContext()
    // Mock token without project_id
    if (ctx.openstack) {
      ctx.openstack.getToken = vi.fn().mockReturnValue({
        tokenData: {
          user: { id: TEST_USER_ID, name: "test-user" },
          project: undefined,
        },
      })
    }

    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({
        project_id: TEST_PROJECT_ID,
        credentialId: TEST_CREDENTIAL_ID,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "Project ID not found in token",
      })
    )
  })
})
