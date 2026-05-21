import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "../../../context"
import { containerRouter } from "./containerRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"

// ============================================================================
// MOCK AWS SDK S3 CLIENT
// ============================================================================

const mockSend = vi.fn()

vi.mock("../../clients/s3Client", () => ({
  createS3Client: vi.fn(() => ({ send: mockSend })),
}))

// ============================================================================
// MOCK DATA
// ============================================================================

const TEST_PROJECT_ID = "test-project-id"
const TEST_USER_ID = "test-user-id"
const TEST_ACCESS = "AKIAIOSFODNN7EXAMPLE"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
const TEST_BUCKET_NAME = "my-test-bucket"
const TEST_CREATION_DATE = new Date("2024-01-15T10:00:00Z")

// ============================================================================
// MOCK CONTEXT
// ============================================================================

const createMockContext = (shouldFailAuth = false, hasCredentials = true) => {
  const credBlob = JSON.stringify({ access: TEST_ACCESS, secret: TEST_SECRET })
  const mockIdentity = {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        credentials: hasCredentials
          ? [{ id: "cred-id", type: "ec2", project_id: TEST_PROJECT_ID, user_id: TEST_USER_ID, blob: credBlob }]
          : [],
      }),
    }),
    availableEndpoints: vi.fn().mockReturnValue([]),
  }

  const mockCephService = {
    getEndpoint: () => "https://test-ceph.example.com",
  }

  const mockToken = {
    tokenData: {
      project: { id: TEST_PROJECT_ID },
      user: {
        id: TEST_USER_ID,
        domain: { id: "default", name: "Default" },
        name: "test-user",
        password_expires_at: "",
      },
      catalog: [
        {
          type: "ceph",
          name: "ceph",
          endpoints: [{ region: "test-region", url: "https://test-ceph.example.com" }],
        },
      ],
      expires_at: "",
      issued_at: "",
      methods: [],
      roles: [],
    },
  }

  const mockOpenstack = {
    service: (serviceName: string) => {
      if (serviceName === "ceph") return mockCephService
      return mockIdentity
    },
    getToken: vi.fn().mockReturnValue(mockToken),
  }

  return {
    req: { headers: {} },
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    openstack: mockOpenstack,
    rescopeSession: vi.fn().mockResolvedValue(mockOpenstack),
  } as unknown as AuroraPortalContext
}

const createCaller = createCallerFactory(auroraRouter({ storage: { ceph: { containers: containerRouter } } }))

// ============================================================================
// buckets.list
// ============================================================================

describe("buckets.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // First call returns list of buckets
    mockSend.mockResolvedValueOnce({
      Buckets: [{ Name: TEST_BUCKET_NAME, CreationDate: TEST_CREATION_DATE }],
      $metadata: { httpStatusCode: 200 },
    })
    // Second call returns bucket metadata (ListObjectsV2)
    mockSend.mockResolvedValueOnce({
      Contents: [],
      KeyCount: 0,
      $metadata: { httpStatusCode: 200 },
    })
  })

  it("returns list of buckets", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual([
      {
        name: TEST_BUCKET_NAME,
        creationDate: TEST_CREATION_DATE.toISOString(),
        count: 0,
        bytes: 0,
        last_modified: undefined,
      },
    ])
  })

  it("returns empty array when no buckets exist", async () => {
    mockSend.mockReset()
    mockSend.mockResolvedValue({ Buckets: [], $metadata: { httpStatusCode: 200 } })
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual([])
  })

  it("returns empty array when Buckets is undefined", async () => {
    mockSend.mockReset()
    mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } })
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })

    expect(result).toEqual([])
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("throws FORBIDDEN with NO_CEPH_CREDENTIALS when no EC2 credentials exist", async () => {
    const ctx = createMockContext(false, false)
    const caller = createCaller(ctx)

    await expect(caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "NO_CEPH_CREDENTIALS" })
    )
  })

  it("maps S3 errors to TRPCError", async () => {
    mockSend.mockReset()
    const s3Error = Object.assign(new Error("Access denied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(TRPCError)
  })
})
