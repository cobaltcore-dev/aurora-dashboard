import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { versioningRouter } from "./versioningRouter"
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
    it("should detect folders with deleted content", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [
          {
            Key: "folder1/file1.txt",
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
        folders: ["folder1/"],
      })

      expect(result).toHaveLength(1)
      expect(result[0].prefix).toBe("folder1/")
      expect(result[0].hasDeletedContent).toBe(true)
      expect(result[0].isFolderDeleted).toBe(false)
    })

    it("should detect when folder marker itself is deleted", async () => {
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
        folders: ["folder1/"],
      })

      expect(result).toHaveLength(1)
      expect(result[0].prefix).toBe("folder1/")
      expect(result[0].hasDeletedContent).toBe(true)
      expect(result[0].isFolderDeleted).toBe(true)
    })

    it("should detect both deleted folder marker and deleted content", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [
          {
            Key: "folder1/",
            VersionId: "dm-folder",
            IsLatest: true,
            LastModified: TEST_DATE,
          },
          {
            Key: "folder1/file.txt",
            VersionId: "dm-file",
            IsLatest: true,
            LastModified: TEST_DATE,
          },
        ],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        folders: ["folder1/"],
      })

      expect(result).toHaveLength(1)
      expect(result[0].hasDeletedContent).toBe(true)
      expect(result[0].isFolderDeleted).toBe(true)
    })

    it("should return false when no deleted content", async () => {
      mockSend.mockResolvedValueOnce({
        DeleteMarkers: [],
        IsTruncated: false,
      })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        folders: ["folder1/"],
      })

      expect(result).toHaveLength(1)
      expect(result[0].hasDeletedContent).toBe(false)
      expect(result[0].isFolderDeleted).toBe(false)
    })

    it("should check multiple folders in parallel", async () => {
      mockSend
        .mockResolvedValueOnce({
          DeleteMarkers: [{ Key: "folder1/file.txt", VersionId: "dm-1", IsLatest: true, LastModified: TEST_DATE }],
          IsTruncated: false,
        })
        .mockResolvedValueOnce({
          DeleteMarkers: [],
          IsTruncated: false,
        })

      const result = await caller.checkDeletedContent({
        project_id: TEST_PROJECT_ID,
        bucket: TEST_BUCKET_NAME,
        folders: ["folder1/", "folder2/"],
      })

      expect(result).toHaveLength(2)
      expect(result[0].hasDeletedContent).toBe(true)
      expect(result[1].hasDeletedContent).toBe(false)
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
