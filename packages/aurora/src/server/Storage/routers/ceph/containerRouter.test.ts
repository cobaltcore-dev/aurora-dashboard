import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { containerRouter } from "./containerRouter"
import { createCallerFactory, auroraRouter } from "../../../trpc"
import { createMockContext, TEST_PROJECT_ID } from "./mockContext"
import { S3_MAX_SCAN_PAGES } from "../../constants"

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
// buckets.head
// ============================================================================

describe("buckets.head", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports existence with a single request", async () => {
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.head({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result).toEqual({ exists: true })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  // HeadBucket answers with a bare status, so the SDK raises `NotFound` rather than the
  // `NoSuchBucket` code the body-carrying operations produce. Callers route on NOT_FOUND,
  // so a miss here would surface as a 500 and read as "something broke".
  it("maps the SDK's bodiless NotFound to NOT_FOUND", async () => {
    mockSend.mockRejectedValueOnce(Object.assign(new Error("NotFound"), { name: "NotFound" }))
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.head({ project_id: TEST_PROJECT_ID, bucketName: "no-such-bucket" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("keeps a denied bucket distinct from a missing one", async () => {
    mockSend.mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { name: "Forbidden" }))
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.head({ project_id: TEST_PROJECT_ID, bucketName: TEST_BUCKET_NAME })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("requires credentials", async () => {
    const ctx = createMockContext({ hasCredentials: false })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.head({ project_id: TEST_PROJECT_ID, bucketName: TEST_BUCKET_NAME })
    ).rejects.toThrow(TRPCError)
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

// ============================================================================
// buckets.getState
// ============================================================================

describe("buckets.getState", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * getState opens with two parallel requests, issued in this order: GetBucketVersioning, then a
   * one-key ListObjectsV2 that answers emptiness exactly. Only after those does the version scan
   * (if any) start, so every mocked scan page comes third or later.
   */
  const mockOpeningCalls = ({ status, isEmpty }: { status?: string; isEmpty: boolean }) => {
    mockSend.mockResolvedValueOnce({ Status: status, $metadata: { httpStatusCode: 200 } })
    mockSend.mockResolvedValueOnce({
      KeyCount: isEmpty ? 0 : 1,
      Contents: isEmpty ? [] : [{ Key: "a.txt" }],
      $metadata: { httpStatusCode: 200 },
    })
  }

  it("early-exits on the first page once an old version and a real version are both seen", async () => {
    mockOpeningCalls({ status: "Enabled", isEmpty: false })
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "a.txt", VersionId: "v2", IsLatest: true },
        { Key: "a.txt", VersionId: "v1", IsLatest: false },
      ],
      DeleteMarkers: [],
      IsTruncated: true,
      NextKeyMarker: "a.txt",
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.status).toBe("Enabled")
    expect(result.isVersioningEnabled).toBe(true)
    expect(result.isPartialScan).toBe(false)
    expect(result.hasOldVersionsOrDeleteMarkers).toBe(true)
    expect(result.isEmpty).toBe(false)
    // 2 opening calls + exactly 1 listing page, even though IsTruncated is still true
    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it("reports the raw three-way versioning status, so no caller needs a second GetBucketVersioning", async () => {
    // "Suspended" is the case that makes this worth returning: `isVersioningEnabled` covers it
    // together with "Enabled", but the bucket header renders a different badge for each, and it
    // used to pay a separate `versioning.getStatus` round-trip to tell them apart.
    mockOpeningCalls({ status: "Suspended", isEmpty: false })
    mockSend.mockResolvedValueOnce({
      Versions: [
        { Key: "a.txt", VersionId: "v2", IsLatest: true },
        { Key: "a.txt", VersionId: "v1", IsLatest: false },
      ],
      DeleteMarkers: [],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.status).toBe("Suspended")
    // A suspended bucket keeps whatever history it accumulated while enabled, so it is still
    // scanned - the two flags below are the proof that it was.
    expect(result.isVersioningEnabled).toBe(true)
    expect(result.hasOldVersionsOrDeleteMarkers).toBe(true)
  })

  it("detects a bucket with only delete markers", async () => {
    mockOpeningCalls({ status: "Enabled", isEmpty: true })
    mockSend.mockResolvedValueOnce({
      Versions: [],
      DeleteMarkers: [{ Key: "a.txt", VersionId: "dm-1", IsLatest: true }],
      IsTruncated: false,
      $metadata: { httpStatusCode: 200 },
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.isEmpty).toBe(true)
    expect(result.hasOnlyDeleteMarkers).toBe(true)
    expect(result.hasOldVersionsOrDeleteMarkers).toBe(true)
    expect(result.isPartialScan).toBe(false)
  })

  it("skips the version scan entirely on an unversioned bucket, whatever its size", async () => {
    // An unversioned bucket cannot hold a non-current version or a delete marker, so both
    // history flags are false by definition and there is nothing for a scan to discover.
    // Paging through its current objects only re-learns what ListObjectsV2 already answered.
    mockOpeningCalls({ status: undefined, isEmpty: false })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    // S3 omits Status entirely for a bucket where versioning was never configured.
    expect(result.status).toBe("Unversioned")
    expect(result.isVersioningEnabled).toBe(false)
    expect(result.isEmpty).toBe(false)
    expect(result.hasOldVersionsOrDeleteMarkers).toBe(false)
    expect(result.hasOnlyDeleteMarkers).toBe(false)
    expect(result.isPartialScan).toBe(false)
    // Exactly the two opening calls - no ListObjectVersions at all.
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it("reports emptiness exactly even when the version scan is cut short", async () => {
    // Regression: emptiness used to be derived from the same bounded scan as the history flags,
    // so a bucket too large to scan came back "not fully checked" on every field. DeleteBucketModal
    // blocks on isPartialScan, so such a bucket became permanently undeletable, with a "refresh and
    // try again" that could never succeed. ListObjectsV2 settles emptiness in one request instead.
    mockOpeningCalls({ status: "Enabled", isEmpty: true })
    let call = 0
    mockSend.mockImplementation(() => {
      call++
      return Promise.resolve({
        Versions: [{ Key: `k-${call}`, VersionId: "v1", IsLatest: true }],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: `k-${call}`,
        $metadata: { httpStatusCode: 200 },
      })
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.isPartialScan).toBe(true)
    // Unaffected by the truncated scan - it has its own, exact source.
    expect(result.isEmpty).toBe(true)
  })

  it("does not claim a bucket holds only delete markers when the scan was cut short", async () => {
    // Seeing nothing but delete markers across a truncated scan cannot distinguish "there are no
    // real versions" from "the real versions are on a page we never read". EmptyBucketModal treats
    // hasOnlyDeleteMarkers as "already emptied", so the unknown has to collapse to false.
    mockOpeningCalls({ status: "Enabled", isEmpty: true })
    let call = 0
    mockSend.mockImplementation(() => {
      call++
      return Promise.resolve({
        Versions: [],
        DeleteMarkers: [{ Key: `k-${call}`, VersionId: "dm", IsLatest: true }],
        IsTruncated: true,
        NextKeyMarker: `k-${call}`,
        $metadata: { httpStatusCode: 200 },
      })
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.isPartialScan).toBe(true)
    expect(result.hasOnlyDeleteMarkers).toBe(false)
    // The one thing a truncated scan did prove stays true.
    expect(result.hasOldVersionsOrDeleteMarkers).toBe(true)
  })

  it("stops at the page ceiling without resolving the history flags", async () => {
    mockOpeningCalls({ status: "Enabled", isEmpty: true })
    let call = 0
    mockSend.mockImplementation(() => {
      call++
      return Promise.resolve({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: `key-${call}`,
        $metadata: { httpStatusCode: 200 },
      })
    })

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.isPartialScan).toBe(true)
    expect(result.isEmpty).toBe(true)
    // 2 opening calls + S3_MAX_SCAN_PAGES listing calls
    expect(mockSend).toHaveBeenCalledTimes(S3_MAX_SCAN_PAGES + 2)
  })

  it("stops without throwing when the request is aborted mid-scan", async () => {
    mockOpeningCalls({ status: "Enabled", isEmpty: false })
    const controller = new AbortController()
    mockSend.mockImplementationOnce(() => {
      controller.abort()
      return Promise.resolve({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: "next",
        $metadata: { httpStatusCode: 200 },
      })
    })

    const ctx = createMockContext({ abortSignal: controller.signal })
    const caller = createCaller(ctx)

    const result = await caller.storage.ceph.containers.getState({
      project_id: TEST_PROJECT_ID,
      bucketName: TEST_BUCKET_NAME,
    })

    expect(result.isPartialScan).toBe(true)
    // 2 opening calls + exactly 1 listing page before the abort is observed
    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it("maps AccessDenied from the version scan to FORBIDDEN and logs it", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockOpeningCalls({ status: "Enabled", isEmpty: false })
    mockSend.mockRejectedValueOnce(Object.assign(new Error("Access denied"), { Code: "AccessDenied" }))

    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.getState({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("throws FORBIDDEN when no credentials exist", async () => {
    const ctx = createMockContext({ hasCredentials: false })
    const caller = createCaller(ctx)

    await expect(
      caller.storage.ceph.containers.getState({
        project_id: TEST_PROJECT_ID,
        bucketName: TEST_BUCKET_NAME,
      })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "NO_CEPH_CREDENTIALS" }))
  })
})
