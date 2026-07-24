import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { Readable } from "node:stream"
import { objectRouter } from "./objectRouter"
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
const TEST_OBJECT_KEY = "photos/2024/image.jpg"
const TEST_FOLDER_PREFIX = "photos/2024/"
const TEST_LAST_MODIFIED = new Date("2024-01-15T10:00:00Z")

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
    const ctx = createMockContext({ shouldFailAuth: true })
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
    process.env.CEPH_REGION = "ceph-objectstore-st1-test-region"
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
    const ctx = createMockContext({ shouldFailAuth: true })
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

// ============================================================================
// TESTS: deleteAll
// ============================================================================

describe("objects.deleteAll", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CEPH_REGION = "ceph-objectstore-st1-test-region"
  })

  it("deletes all objects from a bucket and returns count", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // First iteration: Mock list response with versions and delete markers
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "file1.txt", VersionId: "v1" },
        { Key: "file2.txt", VersionId: "v2" },
        { Key: "file3.txt", VersionId: "v3" },
      ],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Mock delete response
    mockSend.mockResolvedValueOnce({
      Deleted: [{ Key: "file1.txt" }, { Key: "file2.txt" }, { Key: "file3.txt" }],
    })

    // Empty scan 1 - bucket now empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 2 - confirm empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 3 - final confirmation
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    const result = await caller.storage.ceph.objects.deleteAll({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toBe(3)
  })

  it("handles paginated deletion with multiple batches", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // First batch (truncated)
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "file1.txt", VersionId: "v1" },
        { Key: "file2.txt", VersionId: "v2" },
      ],
      DeleteMarkers: [],
      IsTruncated: true,
      NextKeyMarker: "file2.txt",
      NextVersionIdMarker: "v2",
    })
    mockSend.mockResolvedValueOnce({
      Deleted: [{ Key: "file1.txt" }, { Key: "file2.txt" }],
    })

    // Second batch (last page)
    mockSend.mockResolvedValueOnce({
      Versions: [{ Key: "file3.txt", VersionId: "v3" }],
      DeleteMarkers: [],
      IsTruncated: false,
    })
    mockSend.mockResolvedValueOnce({
      Deleted: [{ Key: "file3.txt" }],
    })

    // Empty scan 1 - bucket now empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 2 - confirm empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 3 - final confirmation
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    const result = await caller.storage.ceph.objects.deleteAll({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toBe(3)
  })

  it("returns 0 when bucket is empty", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // Empty scan 1
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 2
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 3
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    const result = await caller.storage.ceph.objects.deleteAll({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toBe(0)
  })

  it("deletes both versions and delete markers in versioned buckets", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // First iteration: Mock list response with versions and delete markers
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "file1.txt", VersionId: "v1" },
        { Key: "file1.txt", VersionId: "v2" },
      ],
      DeleteMarkers: [{ Key: "file2.txt", VersionId: "dm1" }],
      IsTruncated: false,
    })

    // Mock delete response
    mockSend.mockResolvedValueOnce({
      Deleted: [
        { Key: "file1.txt", VersionId: "v1" },
        { Key: "file1.txt", VersionId: "v2" },
        { Key: "file2.txt", VersionId: "dm1" },
      ],
    })

    // Empty scan 1 - bucket now empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 2 - confirm empty
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    // Empty scan 3 - final confirmation
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    const result = await caller.storage.ceph.objects.deleteAll({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
    })

    expect(result).toBe(3)
  })

  it("throws error when objects have undefined keys", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // Mock list response with version missing Key
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "file1.txt", VersionId: "v1" },
        { Key: undefined, VersionId: "v2" }, // Invalid version without key
        { Key: "file3.txt", VersionId: "v3" },
      ],
      DeleteMarkers: [],
      IsTruncated: false,
    })

    await expect(
      caller.storage.ceph.objects.deleteAll({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
      })
    ).rejects.toThrow(/Encountered 1 item\(s\) without Key field/)
  })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)

    await expect(
      caller.storage.ceph.objects.deleteAll({
        project_id: TEST_PROJECT_ID,
        containerName: "nonexistent",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

// ============================================================================
// objects.delete
// ============================================================================

describe("objects.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("successfully deletes an object", async () => {
    mockSend.mockResolvedValue({
      $metadata: { httpStatusCode: 204 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.delete({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: TEST_OBJECT_KEY,
    })

    expect(result).toBe(true)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: TEST_BUCKET_NAME,
          Key: TEST_OBJECT_KEY,
        }),
      })
    )
  })

  it("succeeds when deleting non-existent object (idempotent)", async () => {
    mockSend.mockResolvedValue({
      $metadata: { httpStatusCode: 204 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.delete({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "nonexistent.txt",
    })

    expect(result).toBe(true)
  })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.delete({
        project_id: TEST_PROJECT_ID,
        containerName: "nonexistent",
        objectKey: TEST_OBJECT_KEY,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws FORBIDDEN when access is denied", async () => {
    const s3Error = Object.assign(new Error("Access denied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.delete({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: TEST_OBJECT_KEY,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

// ============================================================================
// objects.createFolder
// ============================================================================

describe("objects.createFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a folder with trailing slash", async () => {
    mockSend.mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.createFolder({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      folderPath: "documents/reports/",
    })

    expect(result).toBe(true)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: TEST_BUCKET_NAME,
          Key: "documents/reports/",
          Body: expect.any(Buffer),
          ContentLength: 0,
        }),
      })
    )
  })

  it("normalizes folder path without trailing slash", async () => {
    mockSend.mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.createFolder({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      folderPath: "documents/reports",
    })

    expect(result).toBe(true)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "documents/reports/",
        }),
      })
    )
  })

  it("succeeds when folder already exists (idempotent)", async () => {
    mockSend.mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.createFolder({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      folderPath: "existing-folder/",
    })

    expect(result).toBe(true)
  })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.createFolder({
        project_id: TEST_PROJECT_ID,
        containerName: "nonexistent",
        folderPath: "test/",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

// ============================================================================
// objects.copy
// ============================================================================

describe("objects.copy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("copies object with metadata", async () => {
    mockSend.mockResolvedValue({
      CopyObjectResult: {
        ETag: '"new-etag-123"',
        LastModified: TEST_LAST_MODIFIED,
      },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.copy({
      project_id: TEST_PROJECT_ID,
      sourceBucket: TEST_BUCKET_NAME,
      sourceKey: "source.txt",
      destinationBucket: TEST_BUCKET_NAME,
      destinationKey: "destination.txt",
      copyMetadata: true,
    })

    expect(result).toEqual({
      key: "destination.txt",
      etag: '"new-etag-123"',
      lastModified: TEST_LAST_MODIFIED.toISOString(),
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          CopySource: `/${TEST_BUCKET_NAME}/source.txt`,
          Bucket: TEST_BUCKET_NAME,
          Key: "destination.txt",
          MetadataDirective: "COPY",
        }),
      })
    )
  })

  it("copies object without metadata", async () => {
    mockSend.mockResolvedValue({
      CopyObjectResult: {
        ETag: '"new-etag-456"',
        LastModified: TEST_LAST_MODIFIED,
      },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.ceph.objects.copy({
      project_id: TEST_PROJECT_ID,
      sourceBucket: TEST_BUCKET_NAME,
      sourceKey: "source.txt",
      destinationBucket: "other-bucket",
      destinationKey: "destination.txt",
      copyMetadata: false,
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          MetadataDirective: "REPLACE",
        }),
      })
    )
  })

  it("handles cross-bucket copy", async () => {
    mockSend.mockResolvedValue({
      CopyObjectResult: {
        ETag: '"cross-bucket-etag"',
        LastModified: TEST_LAST_MODIFIED,
      },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.copy({
      project_id: TEST_PROJECT_ID,
      sourceBucket: "bucket-a",
      sourceKey: "file.txt",
      destinationBucket: "bucket-b",
      destinationKey: "file-copy.txt",
    })

    expect(result.key).toBe("file-copy.txt")
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          CopySource: "/bucket-a/file.txt",
          Bucket: "bucket-b",
        }),
      })
    )
  })

  it("throws NOT_FOUND when source object does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.copy({
        project_id: TEST_PROJECT_ID,
        sourceBucket: TEST_BUCKET_NAME,
        sourceKey: "nonexistent.txt",
        destinationBucket: TEST_BUCKET_NAME,
        destinationKey: "dest.txt",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("encodes source key with special characters", async () => {
    mockSend.mockResolvedValue({
      CopyObjectResult: { ETag: '"encoded-etag"', LastModified: TEST_LAST_MODIFIED },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.ceph.objects.copy({
      project_id: TEST_PROJECT_ID,
      sourceBucket: TEST_BUCKET_NAME,
      sourceKey: "file with spaces.txt",
      destinationBucket: TEST_BUCKET_NAME,
      destinationKey: "dest.txt",
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          CopySource: expect.stringContaining("file%20with%20spaces.txt"),
        }),
      })
    )
  })
})

// ============================================================================
// objects.move
// ============================================================================

describe("objects.move", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("moves object successfully (copy + delete)", async () => {
    // Mock copy
    mockSend.mockResolvedValueOnce({
      CopyObjectResult: { ETag: '"moved-etag"', LastModified: TEST_LAST_MODIFIED },
      $metadata: { httpStatusCode: 200 },
    })

    // Mock delete
    mockSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 204 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.move({
      project_id: TEST_PROJECT_ID,
      sourceBucket: TEST_BUCKET_NAME,
      sourceKey: "old-location.txt",
      destinationBucket: TEST_BUCKET_NAME,
      destinationKey: "new-location.txt",
    })

    expect(result).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(2) // copy + delete
  })

  it("throws error if delete fails after successful copy", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    // Mock copy success
    mockSend.mockResolvedValueOnce({
      CopyObjectResult: { ETag: '"moved-etag"', LastModified: TEST_LAST_MODIFIED },
      $metadata: { httpStatusCode: 200 },
    })

    // Mock delete failure
    const deleteError = Object.assign(new Error("AccessDenied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValueOnce(deleteError)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.move({
        project_id: TEST_PROJECT_ID,
        sourceBucket: TEST_BUCKET_NAME,
        sourceKey: "source.txt",
        destinationBucket: "other-bucket",
        destinationKey: "dest.txt",
      })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("Object was copied to other-bucket/dest.txt but failed to delete from source"),
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Move operation: copy succeeded but delete failed",
      expect.objectContaining({
        sourceBucket: TEST_BUCKET_NAME,
        sourceKey: "source.txt",
        destinationBucket: "other-bucket",
        destinationKey: "dest.txt",
      })
    )

    consoleErrorSpy.mockRestore()
  })

  it("throws NOT_FOUND when source does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.move({
        project_id: TEST_PROJECT_ID,
        sourceBucket: TEST_BUCKET_NAME,
        sourceKey: "nonexistent.txt",
        destinationBucket: TEST_BUCKET_NAME,
        destinationKey: "dest.txt",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("handles cross-bucket move", async () => {
    mockSend.mockResolvedValueOnce({
      CopyObjectResult: { ETag: '"cross-etag"', LastModified: TEST_LAST_MODIFIED },
      $metadata: { httpStatusCode: 200 },
    })
    mockSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 204 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.move({
      project_id: TEST_PROJECT_ID,
      sourceBucket: "bucket-a",
      sourceKey: "file.txt",
      destinationBucket: "bucket-b",
      destinationKey: "file.txt",
    })

    expect(result).toBe(true)
  })
})

// ============================================================================
// objects.updateMetadata
// ============================================================================

describe("objects.updateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates object metadata successfully", async () => {
    // Mock HEAD to get current object state (to preserve system headers)
    mockSend.mockResolvedValueOnce({
      ContentType: "text/plain",
      ContentEncoding: "gzip",
      $metadata: { httpStatusCode: 200 },
    })

    // Mock copy to self
    mockSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    })

    // Mock HEAD to get updated metadata
    mockSend.mockResolvedValueOnce({
      ContentLength: 1024,
      LastModified: TEST_LAST_MODIFIED,
      ETag: '"updated-etag"',
      ContentType: "text/plain",
      StorageClass: "STANDARD",
      Metadata: {
        author: "Jane Doe",
        version: "2.0",
      },
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.updateMetadata({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "document.txt",
      metadata: {
        author: "Jane Doe",
        version: "2.0",
      },
    })

    expect(result).toEqual({
      key: "document.txt",
      size: 1024,
      lastModified: TEST_LAST_MODIFIED.toISOString(),
      etag: '"updated-etag"',
      contentType: "text/plain",
      storageClass: "STANDARD",
      metadata: {
        author: "Jane Doe",
        version: "2.0",
      },
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          CopySource: `/${TEST_BUCKET_NAME}/document.txt`,
          Bucket: TEST_BUCKET_NAME,
          Key: "document.txt",
          MetadataDirective: "REPLACE",
          Metadata: {
            author: "Jane Doe",
            version: "2.0",
          },
          ContentType: "text/plain",
          ContentEncoding: "gzip",
        }),
      })
    )
  })

  it("strips x-amz-meta- prefix from user-provided keys", async () => {
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } }) // HEAD
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } }) // COPY
    mockSend.mockResolvedValueOnce({
      ContentLength: 512,
      Metadata: { customkey: "value" },
      $metadata: { httpStatusCode: 200 },
    }) // HEAD

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.storage.ceph.objects.updateMetadata({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "file.txt",
      metadata: {
        "x-amz-meta-customkey": "value",
      },
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Metadata: {
            customkey: "value", // prefix stripped
          },
        }),
      })
    )
  })

  it("handles empty metadata (clears all metadata)", async () => {
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } }) // HEAD
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } }) // COPY
    mockSend.mockResolvedValueOnce({
      ContentLength: 256,
      Metadata: {},
      $metadata: { httpStatusCode: 200 },
    }) // HEAD

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.objects.updateMetadata({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "file.txt",
      metadata: {},
    })

    expect(result.metadata).toEqual({})
  })

  it("throws NOT_FOUND when object does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.updateMetadata({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: "nonexistent.txt",
        metadata: { key: "value" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws NOT_FOUND when bucket does not exist", async () => {
    const s3Error = Object.assign(new Error("NoSuchBucket"), { Code: "NoSuchBucket" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.updateMetadata({
        project_id: TEST_PROJECT_ID,
        containerName: "nonexistent",
        objectKey: "file.txt",
        metadata: { key: "value" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

// ============================================================================
// objects.downloadObject
// ============================================================================

describe("objects.downloadObject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Build a mock GetObject response with a Node Readable body (as the AWS SDK
  // returns in Node).
  const makeBodyResponse = (chunks: Uint8Array[], contentType = "text/plain", contentLength?: number) => ({
    Body: Readable.from(chunks),
    ContentType: contentType,
    ContentLength: contentLength,
    $metadata: { httpStatusCode: 200 },
  })

  it("streams object content as base64 chunks", async () => {
    const content = new TextEncoder().encode("Hello, World!")
    mockSend.mockResolvedValue(makeBodyResponse([content], "text/plain", content.byteLength))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "hello.txt",
      filename: "hello.txt",
      downloadId: `${TEST_BUCKET_NAME}:hello.txt:uuid-1`,
    })

    const chunks: string[] = []
    let receivedContentType: string | undefined
    let receivedFilename: string | undefined
    let lastDownloaded = 0
    let lastTotal = 0
    for await (const item of iterable) {
      chunks.push(item.chunk)
      if (item.contentType) receivedContentType = item.contentType
      if (item.filename) receivedFilename = item.filename
      lastDownloaded = item.downloaded
      lastTotal = item.total
    }

    expect(receivedContentType).toBe("text/plain")
    expect(receivedFilename).toBe("hello.txt")
    const decoded = chunks.map((b64) => Buffer.from(b64, "base64").toString()).join("")
    expect(decoded).toBe("Hello, World!")
    expect(lastDownloaded).toBe(content.byteLength)
    expect(lastTotal).toBe(content.byteLength)
  })

  it("sends contentType and filename only in the first chunk", async () => {
    const c1 = new TextEncoder().encode("part1")
    const c2 = new TextEncoder().encode("part2")
    mockSend.mockResolvedValue(makeBodyResponse([c1, c2]))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "file.txt",
      filename: "file.txt",
      downloadId: `${TEST_BUCKET_NAME}:file.txt:uuid-2`,
    })

    const items: Array<{ chunk: string; contentType?: string; filename?: string }> = []
    for await (const item of iterable) items.push(item)

    expect(items).toHaveLength(2)
    expect(items[0].contentType).toBe("text/plain")
    expect(items[0].filename).toBe("file.txt")
    expect(items[1].contentType).toBeUndefined()
    expect(items[1].filename).toBeUndefined()
  })

  it("falls back to application/octet-stream when ContentType is absent", async () => {
    const content = new TextEncoder().encode("data")
    // Omit ContentType entirely — passing `undefined` through makeBodyResponse
    // would hit its default ("text/plain") instead of leaving the field absent.
    mockSend.mockResolvedValue({
      Body: Readable.from([content]),
      ContentLength: content.byteLength,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "binary.bin",
      filename: "binary.bin",
      downloadId: `${TEST_BUCKET_NAME}:binary.bin:uuid-3`,
    })

    let receivedContentType: string | undefined
    for await (const item of iterable) {
      if (item.contentType) receivedContentType = item.contentType
    }
    expect(receivedContentType).toBe("application/octet-stream")
  })

  it("resolves MIME from key extension when S3 returns binary/octet-stream", async () => {
    const content = new TextEncoder().encode("hello")
    mockSend.mockResolvedValue(makeBodyResponse([content], "binary/octet-stream", content.byteLength))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "notes.txt",
      filename: "notes.txt",
      downloadId: `${TEST_BUCKET_NAME}:notes.txt:uuid-mime-1`,
    })

    let receivedContentType: string | undefined
    for await (const item of iterable) {
      if (item.contentType) receivedContentType = item.contentType
    }
    expect(receivedContentType).toBe("text/plain")
  })

  it("prefers the key extension over a wrong stored content type", async () => {
    // Some upload tools store text files as application/x-www-form-urlencoded,
    // which forces the browser to download. The extension wins.
    const content = new TextEncoder().encode("hello")
    mockSend.mockResolvedValue(makeBodyResponse([content], "application/x-www-form-urlencoded", content.byteLength))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "test_file_key2.txt",
      filename: "test_file_key2.txt",
      downloadId: `${TEST_BUCKET_NAME}:test_file_key2.txt:uuid-mime-2`,
    })

    let receivedContentType: string | undefined
    for await (const item of iterable) {
      if (item.contentType) receivedContentType = item.contentType
    }
    expect(receivedContentType).toBe("text/plain")
  })

  it("keeps the stored content type when the key has no recognized extension", async () => {
    const content = new TextEncoder().encode("hello")
    mockSend.mockResolvedValue(makeBodyResponse([content], "text/html", content.byteLength))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "a1b2c3d4-no-extension",
      filename: "a1b2c3d4-no-extension",
      downloadId: `${TEST_BUCKET_NAME}:a1b2c3d4:uuid-mime-3`,
    })

    let receivedContentType: string | undefined
    for await (const item of iterable) {
      if (item.contentType) receivedContentType = item.contentType
    }
    expect(receivedContentType).toBe("text/html")
  })

  it("reports total as 0 when ContentLength is absent", async () => {
    const content = new TextEncoder().encode("abc")
    mockSend.mockResolvedValue(makeBodyResponse([content], "text/plain", undefined))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "x.txt",
      filename: "x.txt",
      downloadId: `${TEST_BUCKET_NAME}:x.txt:uuid-4`,
    })

    let lastTotal = -1
    for await (const item of iterable) lastTotal = item.total
    expect(lastTotal).toBe(0)
  })

  it("yields nothing for an empty body", async () => {
    mockSend.mockResolvedValue(makeBodyResponse([], "text/plain", 0))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "empty.txt",
      filename: "empty.txt",
      downloadId: `${TEST_BUCKET_NAME}:empty.txt:uuid-5`,
    })

    const items: unknown[] = []
    for await (const item of iterable) items.push(item)
    expect(items).toHaveLength(0)
  })

  it("requests the object from the correct bucket and key", async () => {
    const content = new TextEncoder().encode("data")
    mockSend.mockResolvedValue(makeBodyResponse([content]))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: TEST_OBJECT_KEY,
      filename: "image.jpg",
      downloadId: `${TEST_BUCKET_NAME}:${TEST_OBJECT_KEY}:uuid-6`,
    })
    for await (const item of iterable) void item

    const sentCommand = mockSend.mock.calls[0][0]
    expect(sentCommand.input).toMatchObject({ Bucket: TEST_BUCKET_NAME, Key: TEST_OBJECT_KEY })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ shouldFailAuth: true })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.downloadObject({
        project_id: TEST_PROJECT_ID,
        containerName: TEST_BUCKET_NAME,
        objectKey: TEST_OBJECT_KEY,
        filename: "image.jpg",
        downloadId: `${TEST_BUCKET_NAME}:${TEST_OBJECT_KEY}:uuid-7`,
      })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })

  it("surfaces S3 errors while iterating", async () => {
    const s3Error = Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "missing.txt",
      filename: "missing.txt",
      downloadId: `${TEST_BUCKET_NAME}:missing.txt:uuid-8`,
    })

    await expect(async () => {
      for await (const item of iterable) void item
    }).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("tracks cumulative progress across chunks", async () => {
    const p1 = new TextEncoder().encode("Hello, ")
    const p2 = new TextEncoder().encode("World!")
    const totalBytes = p1.byteLength + p2.byteLength
    mockSend.mockResolvedValue(makeBodyResponse([p1, p2], "text/plain", totalBytes))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const iterable = await caller.storage.ceph.objects.downloadObject({
      project_id: TEST_PROJECT_ID,
      containerName: TEST_BUCKET_NAME,
      objectKey: "hello.txt",
      filename: "hello.txt",
      downloadId: `${TEST_BUCKET_NAME}:hello.txt:uuid-9`,
    })

    const snapshots: Array<{ downloaded: number; total: number }> = []
    for await (const { downloaded, total } of iterable) snapshots.push({ downloaded, total })

    expect(snapshots).toHaveLength(2)
    expect(snapshots[0].downloaded).toBe(p1.byteLength)
    expect(snapshots[1].downloaded).toBe(totalBytes)
    expect(snapshots[1].total).toBe(totalBytes)
  })
})

// ============================================================================
// objects.uploadObject
// ============================================================================
//
// NOTE: these tests assume the shared `./mockContext` `createMockContext`
// exposes a mutable `ctx.req.headers` and provides a `rescopeSession` that
// resolves to a valid OpenStack session (the same shape cephProcedure.test.ts's
// inline mock uses). uploadObject runs on `cephUploadProcedure`, which rescopes
// from the `x-upload-project-id` header rather than a tRPC input. If the shared
// mock lacks `rescopeSession`, add it there.

describe("objects.uploadObject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } })
  })

  // octetInputParser never runs under createCaller (no HTTP transport), so we
  // pass a ReadableStream directly, cast to satisfy the runtime type.
  const callUpload = (caller: ReturnType<typeof createCaller>) =>
    caller.storage.ceph.objects.uploadObject(new ReadableStream() as never)

  const setUploadHeaders = (
    ctx: ReturnType<typeof createMockContext>,
    fields: {
      projectId?: string
      container?: string
      object?: string
      contentType?: string
      fileSize?: string
      uploadId?: string
    }
  ) => {
    const h = ctx.req.headers as Record<string, string>
    if (fields.projectId) h["x-upload-project-id"] = fields.projectId
    if (fields.container) h["x-upload-container"] = fields.container
    if (fields.object) h["x-upload-object"] = fields.object
    if (fields.contentType) h["x-upload-type"] = fields.contentType
    if (fields.fileSize) h["x-upload-size"] = fields.fileSize
    if (fields.uploadId) h["x-upload-id"] = fields.uploadId
  }

  const validHeaders = {
    projectId: TEST_PROJECT_ID,
    container: TEST_BUCKET_NAME,
    object: "folder/sample.txt",
    fileSize: "1024",
    uploadId: `${TEST_BUCKET_NAME}:folder/sample.txt:uuid-1`,
  }

  it("PUTs to the correct bucket and key", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, validHeaders)
    const caller = createCaller(ctx)

    await callUpload(caller)

    const sentCommand = mockSend.mock.calls[0][0]
    expect(sentCommand.input).toMatchObject({
      Bucket: TEST_BUCKET_NAME,
      Key: "folder/sample.txt",
      ContentLength: 1024,
    })
  })

  it("uses the detected content type from the header", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, { ...validHeaders, object: "image.png", contentType: "image/png", uploadId: "b:image.png:u" })
    const caller = createCaller(ctx)

    await callUpload(caller)

    expect(mockSend.mock.calls[0][0].input).toMatchObject({ ContentType: "image/png" })
  })

  it("falls back to application/octet-stream when the content-type header is absent", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, { ...validHeaders, object: "file.bin", uploadId: "b:file.bin:u" })
    const caller = createCaller(ctx)

    await callUpload(caller)

    expect(mockSend.mock.calls[0][0].input).toMatchObject({ ContentType: "application/octet-stream" })
  })

  it("returns { success: true } on success", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, validHeaders)
    const caller = createCaller(ctx)

    const result = await callUpload(caller)

    expect(result.success).toBe(true)
    expect(result).not.toHaveProperty("uploadId")
  })

  it("throws BAD_REQUEST when x-upload-project-id header is missing", async () => {
    const ctx = createMockContext()
    // Everything except the project id (checked by cephUploadProcedure).
    setUploadHeaders(ctx, { ...validHeaders, projectId: undefined })
    const caller = createCaller(ctx)

    await expect(callUpload(caller)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "x-upload-project-id header is required for uploads" })
    )
  })

  it("throws BAD_REQUEST when x-upload-container header is missing", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, { ...validHeaders, container: undefined })
    const caller = createCaller(ctx)

    await expect(callUpload(caller)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "x-upload-container header is required" })
    )
  })

  it("throws BAD_REQUEST when x-upload-id header is missing", async () => {
    const ctx = createMockContext()
    setUploadHeaders(ctx, { ...validHeaders, uploadId: undefined })
    const caller = createCaller(ctx)

    await expect(callUpload(caller)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "x-upload-id header is required" })
    )
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ shouldFailAuth: true })
    setUploadHeaders(ctx, validHeaders)
    const caller = createCaller(ctx)

    await expect(callUpload(caller)).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("surfaces S3 errors when PutObject fails", async () => {
    const s3Error = Object.assign(new Error("AccessDenied"), { Code: "AccessDenied" })
    mockSend.mockRejectedValue(s3Error)

    const ctx = createMockContext()
    setUploadHeaders(ctx, validHeaders)
    const caller = createCaller(ctx)

    await expect(callUpload(caller)).rejects.toThrow()
  })
})

// ============================================================================
// objects.watchUploadProgress
// ============================================================================

describe("objects.watchUploadProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ shouldFailAuth: true })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.objects.watchUploadProgress({
        project_id: TEST_PROJECT_ID,
        uploadId: `${TEST_BUCKET_NAME}:file.txt:uuid`,
      })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })

  it("does not yield for an unknown uploadId until an event arrives", async () => {
    // Fake timers let us both prove next() stays pending without an event AND
    // drive the generator's internal 30s wait to completion so it cleans up its
    // own timer — awaiting iterator.return() can't do that here, since .return()
    // on an async generator waits for the pending `await` (the 30s race) to
    // settle before running the finally block, which would hang the test.
    vi.useFakeTimers()
    try {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const subscription = await caller.storage.ceph.objects.watchUploadProgress({
        project_id: TEST_PROJECT_ID,
        uploadId: "nonexistent:file.txt:uuid",
      })
      const iterator = subscription[Symbol.asyncIterator]()

      const nextPromise = iterator.next()
      let settled = false
      void nextPromise.then(() => {
        settled = true
      })

      // No progress event and no snapshot for this id → next() stays pending.
      await vi.advanceTimersByTimeAsync(1_000)
      expect(settled).toBe(false)

      // Advance past the 30s bounded wait: the generator breaks out, clears its
      // timer, and completes.
      await vi.advanceTimersByTimeAsync(30_000)
      const result = await nextPromise
      expect(result.done).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("returns an async iterable", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    // Live progress events require the module-level emitter, which is not
    // exported — emitter round-trip coverage lives in integration tests.
    const subscription = await caller.storage.ceph.objects.watchUploadProgress({
      project_id: TEST_PROJECT_ID,
      uploadId: `${TEST_BUCKET_NAME}:file.txt:uuid`,
    })

    expect(subscription).toBeDefined()
    expect(typeof subscription[Symbol.asyncIterator]).toBe("function")
  })
})
