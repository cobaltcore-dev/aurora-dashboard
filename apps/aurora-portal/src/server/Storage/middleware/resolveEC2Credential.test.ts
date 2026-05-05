import { describe, it, expect, vi } from "vitest"
import { AuroraPortalContext } from "../../context"
import { resolveEC2Credential } from "./resolveEC2Credential"

// ============================================================================
// MOCK DATA
// ============================================================================

const TEST_PROJECT_ID = "test-project-id"
const TEST_USER_ID = "test-user-id"
const TEST_CREDENTIAL_ID = "cred-abc-123"
const TEST_ACCESS = "AKIAIOSFODNN7EXAMPLE"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

const mockBlob = JSON.stringify({ access: TEST_ACCESS, secret: TEST_SECRET })

const rawCredential = {
  id: TEST_CREDENTIAL_ID,
  type: "ec2",
  project_id: TEST_PROJECT_ID,
  user_id: TEST_USER_ID,
  blob: mockBlob,
}

// ============================================================================
// HELPERS
// ============================================================================

const createMockContext = () => {
  const mockIdentity = {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ credentials: [rawCredential] }),
    }),
  }

  const mockToken = {
    tokenData: {
      project: { id: TEST_PROJECT_ID },
      user: { id: TEST_USER_ID },
    },
  }

  return {
    openstack: {
      service: vi.fn().mockReturnValue(mockIdentity),
      getToken: vi.fn().mockReturnValue(mockToken),
    },
    mockIdentity,
    mockToken,
  } as unknown as AuroraPortalContext & {
    mockIdentity: typeof mockIdentity
    mockToken: typeof mockToken
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("resolveEC2Credential", () => {
  it("returns credential when found for the current project", async () => {
    const ctx = createMockContext()

    const result = await resolveEC2Credential(ctx)

    expect(result).toEqual({
      credentialId: TEST_CREDENTIAL_ID,
      access: TEST_ACCESS,
      secret: TEST_SECRET,
    })
  })

  it("returns null when no credentials exist", async () => {
    const ctx = createMockContext()
    ctx.mockIdentity.get.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ credentials: [] }),
    })

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("returns null when credential belongs to a different project", async () => {
    const ctx = createMockContext()
    ctx.mockIdentity.get.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [{ ...rawCredential, project_id: "other-project" }],
      }),
    })

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("returns null when identity service returns a non-ok response", async () => {
    const ctx = createMockContext()
    ctx.mockIdentity.get.mockResolvedValue({ ok: false, status: 403 })

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("returns null when userId is missing from token", async () => {
    const ctx = createMockContext()
    ;(ctx.openstack!.getToken as ReturnType<typeof vi.fn>).mockReturnValue({
      tokenData: { project: { id: TEST_PROJECT_ID } },
    })

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("returns null when projectId is missing from token", async () => {
    const ctx = createMockContext()
    ;(ctx.openstack!.getToken as ReturnType<typeof vi.fn>).mockReturnValue({
      tokenData: { user: { id: TEST_USER_ID } },
    })

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("returns null when openstack is undefined on ctx", async () => {
    const ctx = { openstack: undefined } as unknown as AuroraPortalContext

    const result = await resolveEC2Credential(ctx)

    expect(result).toBeNull()
  })

  it("picks first matching credential when multiple exist", async () => {
    const ctx = createMockContext()
    const secondCredBlob = JSON.stringify({ access: "SECOND_ACCESS", secret: "SECOND_SECRET" })
    ctx.mockIdentity.get.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: [
          rawCredential,
          { ...rawCredential, id: "cred-2", blob: secondCredBlob },
        ],
      }),
    })

    const result = await resolveEC2Credential(ctx)

    expect(result?.access).toBe(TEST_ACCESS)
    expect(result?.credentialId).toBe(TEST_CREDENTIAL_ID)
  })
})
