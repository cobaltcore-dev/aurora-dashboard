import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { containerRouter } from "./containerRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { createMockContext, TEST_PROJECT_ID } from "./mockContext"

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

const TEST_BUCKET_NAME = "my-test-bucket"
const TEST_CREATION_DATE = new Date("2024-01-15T10:00:00Z")

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
    const ctx = createMockContext({ shouldFailAuth: true })
    const caller = createCaller(ctx)

    await expect(caller.storage.ceph.containers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("throws FORBIDDEN with NO_CEPH_CREDENTIALS when no EC2 credentials exist", async () => {
    const ctx = createMockContext({ hasCredentials: false })
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

// ============================================================================
// buckets.create
// ============================================================================

describe("buckets.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a new bucket successfully", async () => {
    // Mock ListBucketsCommand to return empty list (no existing buckets)
    mockSend.mockResolvedValueOnce({
      Buckets: [],
      $metadata: { httpStatusCode: 200 },
    })
    // Mock CreateBucketCommand success
    mockSend.mockResolvedValueOnce({
      Location: `/${TEST_BUCKET_NAME}`,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.create({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
      enableVersioning: false,
    })

    expect(result).toEqual({ success: true })
    expect(mockSend).toHaveBeenCalledTimes(2) // ListBucketsCommand + CreateBucketCommand
  })

  it("throws CONFLICT when bucket already exists", async () => {
    // Mock ListBucketsCommand to return existing bucket
    mockSend.mockResolvedValueOnce({
      Buckets: [{ Name: TEST_BUCKET_NAME, CreationDate: TEST_CREATION_DATE }],
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const error = await caller.storage.ceph.containers
      .create({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        enableVersioning: false,
      })
      .catch((e) => e)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toContain("Failed to create bucket")
    expect(error.message).toContain(TEST_BUCKET_NAME)

    expect(mockSend).toHaveBeenCalledTimes(1) // Only ListBucketsCommand, CreateBucketCommand not called
  })

  it("creates bucket with versioning enabled", async () => {
    // Mock ListBucketsCommand
    mockSend.mockResolvedValueOnce({
      Buckets: [],
      $metadata: { httpStatusCode: 200 },
    })
    // Mock CreateBucketCommand
    mockSend.mockResolvedValueOnce({
      Location: `/${TEST_BUCKET_NAME}`,
      $metadata: { httpStatusCode: 200 },
    })
    // Mock PutBucketVersioningCommand
    mockSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.create({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
      enableVersioning: true,
    })

    expect(result).toEqual({ success: true })
    expect(mockSend).toHaveBeenCalledTimes(3) // ListBucketsCommand + CreateBucketCommand + PutBucketVersioningCommand
  })

  it("returns success with versioningError when versioning fails", async () => {
    // Mock ListBucketsCommand
    mockSend.mockResolvedValueOnce({
      Buckets: [],
      $metadata: { httpStatusCode: 200 },
    })
    // Mock CreateBucketCommand
    mockSend.mockResolvedValueOnce({
      Location: `/${TEST_BUCKET_NAME}`,
      $metadata: { httpStatusCode: 200 },
    })
    // Mock PutBucketVersioningCommand failure
    const versioningError = Object.assign(new Error("Versioning not supported"), {
      Code: "InvalidBucketState",
    })
    mockSend.mockRejectedValueOnce(versioningError)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.create({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
      enableVersioning: true,
    })

    expect(result).toEqual({
      success: true,
      versioningError: expect.stringContaining("Failed to enable versioning"),
    })
  })

  it("throws FORBIDDEN when no credentials exist", async () => {
    const ctx = createMockContext({ hasCredentials: false })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.create({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
        enableVersioning: false,
      })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "NO_CEPH_CREDENTIALS" }))
  })
})
