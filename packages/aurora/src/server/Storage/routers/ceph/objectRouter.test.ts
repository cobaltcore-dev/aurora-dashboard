import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
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

    // Second iteration: Check again - now empty
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

    // Third iteration: Check again from beginning - now empty
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

    // Second iteration: Check again - now empty
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
