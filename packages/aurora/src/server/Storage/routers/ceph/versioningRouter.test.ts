import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { versioningRouter } from "./versioningRouter"
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
const TEST_OBJECT_KEY = "my-object.txt"
const TEST_VERSION_ID = "version-123"
const TEST_DATE = new Date("2024-01-15T10:00:00Z")

// ============================================================================
// TESTS
// ============================================================================

describe("versioningRouter", () => {
  const router = auroraRouter(versioningRouter)
  const createCaller = createCallerFactory(router)
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    const ctx = createMockContext()
    caller = createCaller(ctx)
  })

  describe("getStatus", () => {
    it("should get versioning status - Enabled", async () => {
      mockSend.mockResolvedValueOnce({
        Status: "Enabled",
      })

      const result = await caller.getStatus({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
      })

      expect(result.status).toBe("Enabled")
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should get versioning status - Unversioned", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.getStatus({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
      })

      expect(result.status).toBe("Unversioned")
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.getStatus({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("setStatus", () => {
    it("should enable versioning", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.setStatus({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        status: "Enabled",
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should suspend versioning", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.setStatus({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        status: "Suspended",
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.setStatus({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          status: "Enabled",
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("listVersions", () => {
    it("should list versions in a bucket", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [
          {
            Key: TEST_OBJECT_KEY,
            VersionId: TEST_VERSION_ID,
            IsLatest: true,
            LastModified: TEST_DATE,
            Size: 1024,
            StorageClass: "STANDARD",
            ETag: "etag123",
          },
        ],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.listVersions({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
      })

      expect(result.versions).toHaveLength(1)
      expect(result.versions[0].key).toBe(TEST_OBJECT_KEY)
      expect(result.versions[0].versionId).toBe(TEST_VERSION_ID)
      expect(result.versions[0].isLatest).toBe(true)
      expect(result.deleteMarkers).toHaveLength(0)
      expect(result.isTruncated).toBe(false)
    })

    it("should handle pagination", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: "next-key",
        NextVersionIdMarker: "next-version",
      })

      const result = await caller.listVersions({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        maxKeys: 10,
      })

      expect(result.isTruncated).toBe(true)
      expect(result.nextKeyMarker).toBe("next-key")
      expect(result.nextVersionIdMarker).toBe("next-version")
    })

    it("should include delete markers", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [
          {
            Key: TEST_OBJECT_KEY,
            VersionId: "dm-123",
            IsLatest: true,
            LastModified: TEST_DATE,
          },
        ],
        IsTruncated: false,
      })

      const result = await caller.listVersions({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
      })

      expect(result.deleteMarkers).toHaveLength(1)
      expect(result.deleteMarkers[0].isDeleteMarker).toBe(true)
    })
  })

  describe("listObjectVersions", () => {
    it("should list versions for a specific object", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [
          {
            Key: TEST_OBJECT_KEY,
            VersionId: "v2",
            IsLatest: true,
            LastModified: new Date("2024-01-15T11:00:00Z"),
            Size: 2048,
          },
          {
            Key: TEST_OBJECT_KEY,
            VersionId: "v1",
            IsLatest: false,
            LastModified: TEST_DATE,
            Size: 1024,
          },
        ],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.listObjectVersions({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: TEST_OBJECT_KEY,
      })

      expect(result).toHaveLength(2)
      // Should be sorted newest first
      expect(result[0].versionId).toBe("v2")
      expect(result[1].versionId).toBe("v1")
    })
  })

  describe("deleteVersion", () => {
    it("should delete a specific version", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.deleteVersion({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: TEST_OBJECT_KEY,
        versionId: TEST_VERSION_ID,
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.deleteVersion({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          key: TEST_OBJECT_KEY,
          versionId: TEST_VERSION_ID,
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe("restoreVersion", () => {
    it("should restore a previous version", async () => {
      mockSend.mockResolvedValueOnce({
        VersionId: "new-version-456",
      })

      const result = await caller.restoreVersion({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: TEST_OBJECT_KEY,
        versionId: TEST_VERSION_ID,
      })

      expect(result.success).toBe(true)
      expect(result.versionId).toBe("new-version-456")
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it("should handle null version ID", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await caller.restoreVersion({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: TEST_OBJECT_KEY,
        versionId: TEST_VERSION_ID,
      })

      expect(result.success).toBe(true)
      expect(result.versionId).toBe("null")
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.restoreVersion({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          key: TEST_OBJECT_KEY,
          versionId: TEST_VERSION_ID,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should properly URL-encode keys with special characters", async () => {
      mockSend.mockResolvedValueOnce({
        VersionId: "new-version-789",
      })

      const keyWithSpaces = "my folder/my file.txt"
      const result = await caller.restoreVersion({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: keyWithSpaces,
        versionId: TEST_VERSION_ID,
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()

      // Verify CopySource has encoded key
      const copyCommand = mockSend.mock.calls[0][0]
      expect(copyCommand.input.CopySource).toContain(encodeURIComponent(keyWithSpaces))
      expect(copyCommand.input.CopySource).toBe(
        `${TEST_BUCKET_NAME}/${encodeURIComponent(keyWithSpaces)}?versionId=${TEST_VERSION_ID}`
      )
    })

    it("should handle keys with question marks and ampersands", async () => {
      mockSend.mockResolvedValueOnce({
        VersionId: "new-version-abc",
      })

      const keyWithQueryChars = "file?param=value&other=data.txt"
      const result = await caller.restoreVersion({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        key: keyWithQueryChars,
        versionId: TEST_VERSION_ID,
      })

      expect(result.success).toBe(true)

      // Verify CopySource properly encodes special chars
      const copyCommand = mockSend.mock.calls[0][0]
      expect(copyCommand.input.CopySource).toContain(encodeURIComponent(keyWithQueryChars))
      expect(copyCommand.input.CopySource).not.toContain("?param=value")
    })
  })

  describe("checkDeletedContent", () => {
    it("attributes a nested delete marker to its direct-child folder, not to unrelated folders", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [
          {
            Key: "folder1/a/b.txt",
            VersionId: "dm-123",
            IsLatest: true,
            LastModified: TEST_DATE,
          },
        ],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/", "folder2/"],
      })

      expect(result).toHaveLength(2)
      const folder1 = result.find((r) => r.prefix === "folder1/")
      const folder2 = result.find((r) => r.prefix === "folder2/")
      expect(folder1?.hasDeletedContent).toBe(true)
      expect(folder1?.isFolderDeleted).toBe(false)
      expect(folder2?.hasDeletedContent).toBe(false)
    })

    it("resolves the folder marker version when it and a nested object arrive on the same page", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [
          { Key: "folder1/", VersionId: "v-folder", LastModified: TEST_DATE },
          { Key: "folder1/z.txt", VersionId: "v-obj", LastModified: TEST_DATE },
        ],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].folderMarkerVersionId).toBe("v-folder")
    })

    it("keeps the folder marker version after the marker's own page is followed by more pages", async () => {
      mockSend
        .mockResolvedValueOnce({
          Versions: [{ Key: "folder1/", VersionId: "v-folder", LastModified: TEST_DATE }],
          DeleteMarkers: [],
          IsTruncated: true,
          NextKeyMarker: "folder1/",
          NextVersionIdMarker: "v-folder",
        })
        .mockResolvedValueOnce({
          Versions: [{ Key: "folder1/z.txt", VersionId: "v-obj", LastModified: TEST_DATE }],
          DeleteMarkers: [],
          IsTruncated: false,
        })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].folderMarkerVersionId).toBe("v-folder")
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it("picks the most recent folder marker version across pages (not just the first one seen)", async () => {
      const olderDate = new Date("2024-01-01T00:00:00Z")
      const newerDate = new Date("2024-06-01T00:00:00Z")
      mockSend
        .mockResolvedValueOnce({
          Versions: [{ Key: "folder1/", VersionId: "v-old", LastModified: olderDate }],
          DeleteMarkers: [],
          IsTruncated: true,
          NextKeyMarker: "folder1/",
          NextVersionIdMarker: "v-old",
        })
        .mockResolvedValueOnce({
          Versions: [{ Key: "folder1/", VersionId: "v-new", LastModified: newerDate }],
          DeleteMarkers: [],
          IsTruncated: false,
        })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].folderMarkerVersionId).toBe("v-new")
    })

    it("detects when the folder marker itself is deleted", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [
          {
            Key: "folder1/",
            VersionId: "dm-456",
            IsLatest: true,
            LastModified: TEST_DATE,
          },
        ],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].hasDeletedContent).toBe(true)
      expect(result[0].isFolderDeleted).toBe(true)
      expect(result[0].folderDeleteMarkerVersionId).toBe("dm-456")
    })

    it("ignores non-latest delete markers (a restored object leaves history behind)", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [
          {
            Key: "folder1/restored.txt",
            VersionId: "dm-old",
            IsLatest: false,
            LastModified: TEST_DATE,
          },
        ],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].hasDeletedContent).toBe(false)
    })

    it("does not attribute a loose object at the scanned level to any folder", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [{ Key: "loose.txt", VersionId: "dm-loose", IsLatest: true, LastModified: TEST_DATE }],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(result[0].hasDeletedContent).toBe(false)
    })

    it("stops at the page ceiling and marks folders past the stop point as partially scanned", async () => {
      mockSend.mockImplementation(() => {
        return Promise.resolve({
          Versions: [],
          DeleteMarkers: [],
          IsTruncated: true,
          // Constant marker strictly between "a/" and "z/" lexicographically.
          NextKeyMarker: "m",
        })
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["a/", "z/"],
      })

      expect(mockSend).toHaveBeenCalledTimes(S3_MAX_SCAN_PAGES)
      const folderA = result.find((r) => r.prefix === "a/")
      const folderZ = result.find((r) => r.prefix === "z/")
      expect(folderA?.isPartialScan).toBe(false)
      expect(folderZ?.isPartialScan).toBe(true)
      expect(folderZ?.hasDeletedContent).toBe(false)
    })

    it("treats a truncated page with no continuation marker as a partial scan", async () => {
      // The folder's own marker sorts before its contents ("p/foo/" < "p/foo/x"), so it can be
      // read on a page whose successors never arrive. That used to come back as
      // hasDeletedContent: false with isPartialScan: false — confidently wrong rather than
      // merely unknown.
      mockSend.mockResolvedValueOnce({
        Versions: [{ Key: "p/foo/", VersionId: "fv1", IsLatest: true, LastModified: TEST_DATE }],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: undefined,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "p/",
        folders: ["p/foo/"],
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(result[0].isPartialScan).toBe(true)
      expect(result[0].hasDeletedContent).toBe(false)
      // The marker really was read, so this stays resolved.
      expect(result[0].folderMarkerVersionId).toBe("fv1")
    })

    it("keeps folders closed out before a marker-less truncation reported as fully scanned", async () => {
      // The stop point is the marker the last fetched page started from, so the fix is not a
      // blanket "everything is partial": folders that sort strictly before it were read in full.
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: true,
        // Constant marker strictly between "a/" and "z/" lexicographically.
        NextKeyMarker: "m",
      })
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: undefined,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["a/", "z/"],
      })

      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(result.find((r) => r.prefix === "a/")?.isPartialScan).toBe(false)
      expect(result.find((r) => r.prefix === "z/")?.isPartialScan).toBe(true)
    })

    it("credits the page it just read when a first page truncates with no marker", async () => {
      // There is no previous marker to fall back to here, so the stop point comes from the
      // page's own greatest key. Reporting "nothing is covered" instead would mark every
      // folder in the view partial and, via ObjectBrowserView's neutral rendering, pull every
      // deleted folder back into the All tab.
      mockSend.mockResolvedValueOnce({
        Versions: [
          { Key: "a/", VersionId: "av1", IsLatest: true, LastModified: TEST_DATE },
          { Key: "m/mid.txt", VersionId: "mv1", IsLatest: true, LastModified: TEST_DATE },
        ],
        DeleteMarkers: [],
        IsTruncated: true,
        NextKeyMarker: undefined,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["a/", "z/"],
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      // "a/" sorts entirely before the last key read, so it really was scanned in full.
      expect(result.find((r) => r.prefix === "a/")?.isPartialScan).toBe(false)
      // "z/" sorts after it and was never reached.
      expect(result.find((r) => r.prefix === "z/")?.isPartialScan).toBe(true)
    })

    it("reports isPartialScan: false for every folder once the scan runs to completion", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/", "folder2/"],
      })

      expect(result.every((r) => r.isPartialScan === false)).toBe(true)
    })

    it("uses the standard 1000-key page size", async () => {
      mockSend.mockResolvedValueOnce({ Versions: [], DeleteMarkers: [], IsTruncated: false })

      await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(mockSend.mock.calls[0][0].input.MaxKeys).toBe(1000)
    })

    it("makes no S3 calls and returns a partial result when already aborted", async () => {
      const ctx = createMockContext({ abortSignal: AbortSignal.abort() })
      const abortedCaller = createCaller(ctx)

      const result = await abortedCaller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        folders: ["folder1/"],
      })

      expect(mockSend.mock.calls.length).toBeLessThanOrEqual(1)
      expect(result[0].isPartialScan).toBe(true)
    })

    it("stops after the in-flight page when aborted mid-scan, without throwing", async () => {
      const controller = new AbortController()
      mockSend.mockImplementationOnce(() => {
        controller.abort()
        return Promise.resolve({
          Versions: [],
          DeleteMarkers: [],
          IsTruncated: true,
          NextKeyMarker: "next",
        })
      })

      const ctx = createMockContext({ abortSignal: controller.signal })
      const abortableCaller = createCaller(ctx)

      const result = await abortableCaller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
        // "folder1/" sorts before "next" — the single page fetched before the abort was
        // observed already covered its whole range, so it's correctly NOT partial.
        // "zzz/" sorts after "next" — genuinely unscanned, and must be flagged as such.
        folders: ["folder1/", "zzz/"],
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const folder1 = result.find((r) => r.prefix === "folder1/")
      const zzz = result.find((r) => r.prefix === "zzz/")
      expect(folder1?.isPartialScan).toBe(false)
      expect(zzz?.isPartialScan).toBe(true)
    })

    it("maps AccessDenied to FORBIDDEN and logs instead of silently reporting no deleted content", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSend.mockRejectedValueOnce(Object.assign(new Error("Access denied"), { Code: "AccessDenied" }))

      await expect(
        caller.checkDeletedContent({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          prefix: "",
          folders: ["folder1/"],
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it("maps SlowDown/503 to a TRPCError instead of swallowing it", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSend.mockRejectedValueOnce(Object.assign(new Error("Slow down"), { Code: "SlowDown" }))

      await expect(
        caller.checkDeletedContent({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          prefix: "",
          folders: ["folder1/"],
        })
      ).rejects.toThrow(TRPCError)

      consoleErrorSpy.mockRestore()
    })

    it("sends the caller-supplied prefix to S3 and uses folders only to filter the output", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [{ Key: "shared/folder1/a.txt", VersionId: "dm-1", IsLatest: true, LastModified: TEST_DATE }],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "shared/",
        folders: ["shared/folder1/"],
      })

      expect(mockSend.mock.calls[0][0].input.Prefix).toBe("shared/")
      expect(result).toHaveLength(1)
      expect(result[0].prefix).toBe("shared/folder1/")
      expect(result[0].hasDeletedContent).toBe(true)
    })

    it("returns an entry for every discovered folder when folders is omitted", async () => {
      mockSend.mockResolvedValueOnce({
        Versions: [
          { Key: "folder1/", VersionId: "v1", LastModified: TEST_DATE },
          { Key: "folder2/", VersionId: "v2", LastModified: TEST_DATE },
        ],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
      })

      expect(result.map((r) => r.prefix).sort()).toEqual(["folder1/", "folder2/"])
    })

    it("answers the old {bucket, folders} shape from the folders' parent, not the folder itself", async () => {
      // Regression: the fallback used to return the longest common prefix as-is, which for a
      // single folder is that folder. Keys under it then had no path segment left to attribute,
      // so every folder came back {hasDeletedContent: false, folderMarkerVersionId: undefined,
      // isPartialScan: false} - and ObjectBrowserView reads a missing marker version as
      // "permanently deleted" and hides the folder. Confidently wrong, on the one input shape
      // whose whole point was backward compatibility.
      mockSend.mockResolvedValueOnce({
        Versions: [{ Key: "folder1/", VersionId: "v1", LastModified: TEST_DATE }],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        folders: ["folder1/"],
      })

      // The parent of a top-level folder is the bucket root.
      expect(mockSend.mock.calls[0][0].input.Prefix).toBe(undefined)
      expect(result).toHaveLength(1)
      expect(result[0].prefix).toBe("folder1/")
      expect(result[0].folderMarkerVersionId).toBe("v1")
      expect(result[0].isFolderDeleted).toBe(false)
      expect(result[0].isPartialScan).toBe(false)
    })

    it("rejects folders that do not live under the scanned prefix", async () => {
      // Such a folder is never visited, yet a completed scan marks every unseen folder covered -
      // so it would come back "clean, fully scanned" on data nobody looked at.
      await expect(
        caller.checkDeletedContent({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          prefix: "a/",
          folders: ["z/"],
        })
      ).rejects.toThrow(TRPCError)
    })

    it("accepts the bucket root as an explicit empty prefix", async () => {
      // The object browser's default view sits at the root, where `currentPrefix` is "". That is
      // a real prefix, not a missing one, and the refinement must not reject it.
      mockSend.mockResolvedValueOnce({
        Versions: [{ Key: "folder1/", VersionId: "v1", LastModified: TEST_DATE }],
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        prefix: "",
      })

      expect(result).toHaveLength(1)
      expect(result[0].prefix).toBe("folder1/")
      expect(result[0].folderMarkerVersionId).toBe("v1")
    })

    it("rejects a request that gives neither prefix nor folders", async () => {
      await expect(
        caller.checkDeletedContent({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
        })
      ).rejects.toThrow(TRPCError)
    })

    it("should throw FORBIDDEN when no credentials", async () => {
      const ctx = createMockContext({ hasCredentials: false })
      const callerNoAuth = createCaller(ctx)

      await expect(
        callerNoAuth.checkDeletedContent({
          project_id: TEST_PROJECT_ID,
          bucket: TEST_BUCKET_NAME,
          folders: ["folder1/"],
        })
      ).rejects.toThrow(TRPCError)
    })
  })
})
