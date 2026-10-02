import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
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

  it("answers INTERNAL_SERVER_ERROR when the identity service rejects with something else", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Keystone exploded", 500)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch credential for verification" })
    )
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

  // The status the identity service answered with is the status the caller gets. Each of these is
  // asserted in both shapes a refusal can arrive in - the rejection a real signal-openstack client
  // produces, and the resolved non-ok response the `!ok` branch exists for - because an answer that
  // survives only one of the two is how a 403 came to reach the UI as a generic failure.
  it("answers UNAUTHORIZED when the identity service rejects with a 401", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("The request you have made requires authentication.", 401)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "Authentication failed" }))
  })

  it("answers FORBIDDEN when the identity service rejects with a 403", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("You are not authorized to perform the requested action.", 403)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Access denied" }))
  })

  it("answers UNAUTHORIZED on a resolved 401 from the identity service", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 401 })
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.reveal({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "Authentication failed" }))
  })

  it("answers FORBIDDEN on a resolved 403 from the identity service", async () => {
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

  // `create` generates the secret and hands it to Keystone, but answers without it: the UI shows
  // a new key concealed like any other and reads it through `reveal`. Asserted with `toEqual` so
  // an added field fails here rather than silently putting a secret back on the wire.
  it("returns the new credential without its secret", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual({
      id: TEST_CREDENTIAL_ID,
      access: TEST_ACCESS,
      user_id: TEST_USER_ID,
      project_id: TEST_PROJECT_ID,
    })
    expect(result).not.toHaveProperty("secret")
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

  // `access` and not `secret`: the create path reads the blob through `toEc2Credential`, which
  // has no secret to validate. A blob missing its secret is `reveal`'s problem, and tested there.
  it("throws INTERNAL_SERVER_ERROR when created credential blob is missing the access key", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credential: { ...rawCredential, blob: JSON.stringify({ secret: TEST_SECRET }) },
      }),
    })
    const caller = createCaller(ctx)

    await expect(caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Invalid EC2 credential format"),
    })
  })

  // No ceiling on how many keys a user may hold, so `create` does not read the existing list at
  // all - it posts straight to Keystone. Keystone and RGW impose no limit of their own, and all of
  // a user's keys in a project map to the same RGW identity, so an extra key grants no extra
  // access. Asserting the absent GET and not only the present POST, because the pre-check this
  // replaces was a round trip on every create.
  it("creates without first reading the existing credentials, however many there are", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [rawCredential, { ...rawCredential, id: "cred-2" }, { ...rawCredential, id: "cred-3" }],
      }),
    })
    const caller = createCaller(ctx)

    await caller.storage.s3.ec2Credentials.create({ project_id: TEST_PROJECT_ID })

    expect(ctx.mockIdentity.post).toHaveBeenCalled()
    expect(ctx.mockIdentity.get).not.toHaveBeenCalled()
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

  // Not idempotent on purpose: a credential that is not there is reported as NOT_FOUND, not as a
  // deletion that happened. The three cases below are the three shapes "not there" arrives in.
  it("throws NOT_FOUND when the credential is already gone (404 on the delete call)", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  // The real failure shape: a 404 arrives as a rejection, not as `ok: false`. Without handling it
  // here this would surface as an opaque 500 rather than as the NOT_FOUND the client reports.
  it("throws NOT_FOUND when the ownership fetch rejects with a 404", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Could not find credential", 404)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(ctx.mockIdentity.del).not.toHaveBeenCalled()
  })

  // The delete call answers with the same translation as the ownership read before it, so a
  // Keystone status does not mean one thing on the way in and another on the way out. A 403 here
  // used to escape as a raw SignalOpenstackApiError, reaching the user as an opaque 500 - and now
  // as the text of a toast, which is why it is worth a test of its own.
  // The message travels into a toast verbatim, so a failed delete must not explain itself as a
  // credential that could not be read for verification - that read had already succeeded.
  it("names the delete, not the ownership read, when the delete call fails for another reason", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Keystone exploded", 500)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete EC2 credential" }))
  })

  it("answers FORBIDDEN when the delete call is refused with a 403", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("You are not authorized to perform the requested action.", 403)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Access denied" }))
  })

  it("answers FORBIDDEN on a resolved 403 from the delete call", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Access denied" }))
  })

  it("throws NOT_FOUND when the credential disappears between the check and the delete", async () => {
    const ctx = createMockContext()
    ;(ctx.mockIdentity.del as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SignalOpenstackApiError("Could not find credential", 404)
    )
    const caller = createCaller(ctx)

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
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

  // Reported the same way a missing credential is, and crucially not deleted: this router presents
  // itself as S3 key management, and a `cert` credential is outside that remit.
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

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
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

    await expect(
      caller.storage.s3.ec2Credentials.delete({ project_id: TEST_PROJECT_ID, credentialId: TEST_CREDENTIAL_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    // Same answer as a credential owned by someone else, so the two stay indistinguishable.
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
