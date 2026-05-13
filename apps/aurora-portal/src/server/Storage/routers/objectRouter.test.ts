import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "../../context"
import { objectRouter } from "./objectRouter"
import { createCallerFactory, auroraRouter } from "../../trpc"

// ============================================================================
// MOCK AWS SDK S3 CLIENT
// ============================================================================

const mockSend = vi.fn()

vi.mock("../clients/s3Client", () => ({
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
const TEST_OBJECT_KEY = "photos/2024/image.jpg"
const TEST_FOLDER_PREFIX = "photos/2024/"
const TEST_LAST_MODIFIED = new Date("2024-01-15T10:00:00Z")

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

const createCaller = createCallerFactory(auroraRouter({ storage: { ceph: { objects: objectRouter } } }))

// ============================================================================
// objects.list
// ============================================================================

describe("objects.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns list of objects and folders", async () => {
    mockSend.mockResolvedValue({
      Contents: [
        {
          Key: TEST_OBJECT_KEY,
          LastModified: TEST_LAST_MODIFIED,
          Size: 1024,
          ETag: "abc123",
          StorageClass: "STANDARD",
        },
      ],
      CommonPrefixes: [{ Prefix: TEST_FOLDER_PREFIX }],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.list({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toEqual({
      objects: [
        {
          key: TEST_OBJECT_KEY,
          lastModified: TEST_LAST_MODIFIED.toISOString(),
          size: 1024,
          etag: "abc123",
          storageClass: "STANDARD",
        },
      ],
      folders: [{ prefix: TEST_FOLDER_PREFIX }],
      isTruncated: false,
      nextContinuationToken: undefined,
    })
  })

  it("returns empty arrays when bucket is empty", async () => {
    mockSend.mockResolvedValue({
      Contents: [],
      CommonPrefixes: [],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.list({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toEqual({
      objects: [],
      folders: [],
      isTruncated: false,
      nextContinuationToken: undefined,
    })
  })

  it("handles pagination with continuationToken", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: "obj1.txt", Size: 100, LastModified: TEST_LAST_MODIFIED }],
      IsTruncated: true,
      NextContinuationToken: "token-123",
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.list({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      continuationToken: "token-123",
    })

    expect(result.isTruncated).toBe(true)
    expect(result.nextContinuationToken).toBe("token-123")
  })

  it("applies prefix and delimiter filters", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: "photos/2024/img.jpg", Size: 2048, LastModified: TEST_LAST_MODIFIED }],
      CommonPrefixes: [{ Prefix: "photos/2024/subfolder/" }],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.ceph.objects.list({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      prefix: "photos/",
      delimiter: "/",
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Prefix: "photos/",
          Delimiter: "/",
        }),
      })
    )
  })

  it("respects maxKeys parameter", async () => {
    mockSend.mockResolvedValue({
      Contents: [],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.ceph.objects.list({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      maxKeys: 500,
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          MaxKeys: 500,
        }),
      })
    )
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.list({ project_id: TEST_PROJECT_ID, containerName: TEST_BUCKET_NAME })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })

  // TODO: Re-enable after credential validation is fixed
  // it("throws FORBIDDEN with NO_CEPH_CREDENTIALS when no EC2 credentials exist", async () => {
  //   const ctx = createMockContext(false, false)
  //   const caller = createCaller(ctx)

  //   await expect(
  //     caller.storage.ceph.objects.list({ project_id: TEST_PROJECT_ID, containerName: TEST_BUCKET_NAME })
  //   ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: NO_CEPH_CREDENTIALS }))
  // })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.list({ project_id: TEST_PROJECT_ID, containerName: "nonexistent" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("maps S3 AccessDenied to FORBIDDEN", async () => {
    const s3Error = Object.assign(new Error("Access denied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.list({ project_id: TEST_PROJECT_ID, containerName: TEST_BUCKET_NAME })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

// ============================================================================
// objects.getDetails
// ============================================================================

describe("objects.getDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns object metadata", async () => {
    mockSend.mockResolvedValue({
      ContentLength: 2048,
      LastModified: TEST_LAST_MODIFIED,
      ETag: '"abc123def456"',
      ContentType: "image/jpeg",
      StorageClass: "STANDARD",
      Metadata: { "x-amz-meta-author": "John Doe", "x-amz-meta-version": "1.0" },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.getDetails({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: TEST_OBJECT_KEY,
    })

    expect(result).toEqual({
      key: TEST_OBJECT_KEY,
      size: 2048,
      lastModified: TEST_LAST_MODIFIED.toISOString(),
      etag: '"abc123def456"',
      contentType: "image/jpeg",
      storageClass: "STANDARD",
      metadata: {
        "x-amz-meta-author": "John Doe",
        "x-amz-meta-version": "1.0",
      },
    })
  })

  it("handles missing optional fields", async () => {
    mockSend.mockResolvedValue({
      ContentLength: 512,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.getDetails({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "simple.txt",
    })

    expect(result).toEqual({
      key: "simple.txt",
      size: 512,
      lastModified: undefined,
      etag: undefined,
      contentType: undefined,
      storageClass: undefined,
      metadata: undefined,
    })
  })

  it("throws NOT_FOUND when object does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.getDetails({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: "nonexistent.txt",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.getDetails({
        project_id: TEST_PROJECT_ID,
        containerName: "nonexistent",
        objectKey: TEST_OBJECT_KEY,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext(true)
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.getDetails({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: TEST_OBJECT_KEY,
      })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })

  // TODO: Re-enable after credential validation is fixed
  // it("throws FORBIDDEN with NO_CEPH_CREDENTIALS when no EC2 credentials exist", async () => {
  //   const ctx = createMockContext(false, false)
  //   const caller = createCaller(ctx)

  //   await expect(
  //     caller.storage.ceph.objects.getDetails({
  //       project_id: TEST_PROJECT_ID,
  //       containerName: TEST_BUCKET_NAME,
  //       objectKey: TEST_OBJECT_KEY,
  //     })
  //   ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: NO_CEPH_CREDENTIALS }))
  // })

  it("maps S3 errors to TRPCError", async () => {
    const s3Error = Object.assign(new Error("Access denied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValue(s3Error)
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.getDetails({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: TEST_OBJECT_KEY,
      })
    ).rejects.toThrow(TRPCError)
  })
})
