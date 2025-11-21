import { describe, it, expect, vi, beforeEach, Mock } from "vitest"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "../../context"
import { objectStorageRouter } from "./objectStorageRouter"
import * as objectStorageHelpers from "../helpers/objectStorageHelpers"
import {
  ContainerSummary,
  ObjectSummary,
  AccountInfo,
  ContainerInfo,
  ObjectMetadata,
  ServiceInfo,
} from "../types/objectStorage"
import { createCallerFactory, auroraRouter } from "../../trpc"

// Mock the helpers
vi.mock("../helpers/objectStorageHelpers", async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    validateSwiftService: vi.fn(),
    applyContainerQueryParams: vi.fn(),
    applyObjectQueryParams: vi.fn(),
    parseAccountInfo: vi.fn(),
    parseContainerInfo: vi.fn(),
    parseObjectMetadata: vi.fn(),
    buildAccountMetadataHeaders: vi.fn().mockReturnValue({}),
    buildContainerMetadataHeaders: vi.fn().mockReturnValue({}),
    buildObjectMetadataHeaders: vi.fn().mockReturnValue({}),
    mapErrorResponseToTRPCError: vi.fn(),
    handleZodParsingError: vi.fn(),
    withErrorHandling: vi.fn((fn) => fn()),
    normalizeFolderPath: vi.fn((path) => path),
    isFolderMarker: vi.fn(),
    generateTempUrlSignature: vi.fn().mockReturnValue("mock-signature"),
    constructTempUrl: vi.fn().mockReturnValue("https://swift.example.com/temp-url"),
  }
})

// Mock data
const mockContainerSummary: ContainerSummary = {
  name: "test-container",
  count: 10,
  bytes: 1024,
  last_modified: "2023-01-01T00:00:00Z",
}

const mockObjectSummary: ObjectSummary = {
  name: "test-object.txt",
  hash: "d41d8cd98f00b204e9800998ecf8427e",
  bytes: 512,
  content_type: "text/plain",
  last_modified: "2023-01-01T00:00:00Z",
}

const mockAccountInfo: AccountInfo = {
  objectCount: 100,
  containerCount: 5,
  bytesUsed: 1073741824,
  metadata: { project: "test" },
}

const mockContainerInfo: ContainerInfo = {
  objectCount: 10,
  bytesUsed: 1024,
  metadata: { environment: "dev" },
}

const mockObjectMetadata: ObjectMetadata = {
  contentType: "text/plain",
  contentLength: 512,
  etag: "d41d8cd98f00b204e9800998ecf8427e",
  lastModified: "2023-01-01T00:00:00Z",
}

const mockServiceInfo: ServiceInfo = {
  swift: {
    version: "2.28.0",
  },
}

// Mock context
const createMockContext = (shouldFailAuth = false, shouldFailSwift = false) => {
  const mockSwift = {
    get: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-Account-Container-Count": "5",
        "X-Account-Object-Count": "100",
        "X-Account-Bytes-Used": "1073741824",
      }),
      json: vi.fn().mockResolvedValue([mockContainerSummary]),
      text: vi.fn().mockResolvedValue(""),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    }),
    post: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    }),
    put: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    }),
    patch: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    }),
    del: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    }),
    head: vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
      }),
    }),
    availableEndpoints: vi
      .fn()
      .mockReturnValue([{ interface: "public", url: "https://swift.example.com/v1/AUTH_test" }]),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    createSession: vi.fn().mockResolvedValue({}),
    terminateSession: vi.fn().mockResolvedValue({}),
    openstack: {
      service: vi.fn().mockReturnValue(shouldFailSwift ? null : mockSwift),
    },
    rescopeSession: vi.fn().mockResolvedValue({}),
    mockSwift,
  } as unknown as AuroraPortalContext & { mockSwift: typeof mockSwift }
}

const createCaller = createCallerFactory(auroraRouter({ objectStorage: objectStorageRouter }))

describe("objectStorageRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset withErrorHandling to pass through by default
    ;(objectStorageHelpers.withErrorHandling as Mock).mockImplementation((fn) => fn())
    // Reset parseObjectMetadata to return mock data
    ;(objectStorageHelpers.parseObjectMetadata as Mock).mockReturnValue(mockObjectMetadata)
    // Reset parse functions
    ;(objectStorageHelpers.parseAccountInfo as Mock).mockReturnValue(mockAccountInfo)
    ;(objectStorageHelpers.parseContainerInfo as Mock).mockReturnValue(mockContainerInfo)
  })

  // ============================================================================
  // SERVICE OPERATIONS
  // ============================================================================

  describe("getServiceInfo", () => {
    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.objectStorage.getServiceInfo()).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(mockCtx.validateSession).toHaveBeenCalled()
    })

    it("should successfully get service info", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockServiceInfo),
      })

      const result = await caller.objectStorage.getServiceInfo()

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(objectStorageHelpers.validateSwiftService).toHaveBeenCalled()
      expect(mockCtx.mockSwift.get).toHaveBeenCalledWith("/info")
      expect(result).toEqual(mockServiceInfo)
    })

    it("should handle API error response", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" })

      await expect(caller.objectStorage.getServiceInfo()).rejects.toThrow()
    })
  })

  // ============================================================================
  // ACCOUNT OPERATIONS
  // ============================================================================

  describe("listContainers", () => {
    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.objectStorage.listContainers({ format: "json" })).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )
    })

    it("should successfully list containers", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([mockContainerSummary]),
      })

      const input = { format: "json" as const }
      const result = await caller.objectStorage.listContainers(input)

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(objectStorageHelpers.validateSwiftService).toHaveBeenCalled()
      expect(objectStorageHelpers.applyContainerQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockSwift.get).toHaveBeenCalled()
      expect(result).toEqual([mockContainerSummary])
    })

    it("should handle limit parameter", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([mockContainerSummary]),
      })

      await caller.objectStorage.listContainers({ limit: 100, format: "json" })

      expect(objectStorageHelpers.applyContainerQueryParams).toHaveBeenCalled()
    })

    it("should handle API error response", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" })

      await expect(caller.objectStorage.listContainers({ format: "json" })).rejects.toThrow()
    })
  })

  describe("getAccountMetadata", () => {
    it("should successfully get account metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.parseAccountInfo as Mock).mockReturnValue(mockAccountInfo)

      const result = await caller.objectStorage.getAccountMetadata({})

      expect(mockCtx.mockSwift.head).toHaveBeenCalled()
      expect(objectStorageHelpers.parseAccountInfo).toHaveBeenCalled()
      expect(result).toEqual(mockAccountInfo)
    })

    it("should handle xNewest header", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.parseAccountInfo as Mock).mockReturnValue(mockAccountInfo)

      await caller.objectStorage.getAccountMetadata({ xNewest: true })

      expect(mockCtx.mockSwift.head).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Newest": "true",
          }),
        })
      )
    })
  })

  describe("updateAccountMetadata", () => {
    it("should successfully update account metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        metadata: { project: "new-project" },
      }

      const result = await caller.objectStorage.updateAccountMetadata(input)

      expect(objectStorageHelpers.buildAccountMetadataHeaders).toHaveBeenCalled()
      expect(mockCtx.mockSwift.post).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("should handle remove metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        metadata: {},
        removeMetadata: ["oldKey"],
      }

      await caller.objectStorage.updateAccountMetadata(input)

      expect(objectStorageHelpers.buildAccountMetadataHeaders).toHaveBeenCalledWith(
        {},
        ["oldKey"],
        undefined,
        undefined
      )
    })
  })

  describe("deleteAccount", () => {
    it("should successfully delete account", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const result = await caller.objectStorage.deleteAccount({})

      expect(mockCtx.mockSwift.del).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // CONTAINER OPERATIONS
  // ============================================================================

  describe("listObjects", () => {
    it("should successfully list objects in container", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([mockObjectSummary]),
      })

      const input = { container: "test-container", format: "json" as const }
      const result = await caller.objectStorage.listObjects(input)

      expect(objectStorageHelpers.validateSwiftService).toHaveBeenCalled()
      expect(objectStorageHelpers.applyObjectQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockSwift.get).toHaveBeenCalled()
      expect(result).toEqual([mockObjectSummary])
    })

    it("should handle prefix parameter", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([mockObjectSummary]),
      })

      await caller.objectStorage.listObjects({
        container: "test-container",
        prefix: "logs/",
        format: "json",
      })

      expect(objectStorageHelpers.applyObjectQueryParams).toHaveBeenCalled()
    })
  })

  describe("createContainer", () => {
    it("should successfully create container", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { container: "new-container" }
      const result = await caller.objectStorage.createContainer(input)

      expect(objectStorageHelpers.buildContainerMetadataHeaders).toHaveBeenCalled()
      expect(mockCtx.mockSwift.put).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("should handle metadata during creation", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "new-container",
        metadata: { project: "test" },
      }

      await caller.objectStorage.createContainer(input)

      expect(objectStorageHelpers.buildContainerMetadataHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { project: "test" },
        })
      )
    })
  })

  describe("getContainerMetadata", () => {
    it("should successfully get container metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.parseContainerInfo as Mock).mockReturnValue(mockContainerInfo)

      const input = { container: "test-container" }
      const result = await caller.objectStorage.getContainerMetadata(input)

      expect(mockCtx.mockSwift.head).toHaveBeenCalled()
      expect(objectStorageHelpers.parseContainerInfo).toHaveBeenCalled()
      expect(result).toEqual(mockContainerInfo)
    })
  })

  describe("updateContainerMetadata", () => {
    it("should successfully update container metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "test-container",
        metadata: { environment: "production" },
      }

      const result = await caller.objectStorage.updateContainerMetadata(input)

      expect(objectStorageHelpers.buildContainerMetadataHeaders).toHaveBeenCalled()
      expect(mockCtx.mockSwift.post).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe("deleteContainer", () => {
    it("should successfully delete container", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { container: "test-container" }
      const result = await caller.objectStorage.deleteContainer(input)

      expect(mockCtx.mockSwift.del).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("should handle conflict error for non-empty container", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.del.mockRejectedValue({ statusCode: 409, message: "Conflict" })

      const input = { container: "non-empty-container" }

      await expect(caller.objectStorage.deleteContainer(input)).rejects.toThrow()
    })
  })

  // ============================================================================
  // OBJECT OPERATIONS
  // ============================================================================

  describe("getObject", () => {
    it("should successfully get object content", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const mockBuffer = new ArrayBuffer(512)
      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        headers: new Headers({
          "Content-Type": "text/plain",
          "Content-Length": "512",
        }),
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      })
      ;(objectStorageHelpers.parseObjectMetadata as Mock).mockReturnValue(mockObjectMetadata)

      const input = { container: "test-container", object: "test-object.txt" }
      const result = await caller.objectStorage.getObject(input)

      expect(mockCtx.mockSwift.get).toHaveBeenCalled()
      expect(result.content).toEqual(mockBuffer)
      expect(result.metadata).toEqual(mockObjectMetadata)
    })

    it("should handle range request", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const mockBuffer = new ArrayBuffer(512)
      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      })
      ;(objectStorageHelpers.parseObjectMetadata as Mock).mockReturnValue(mockObjectMetadata)

      await caller.objectStorage.getObject({
        container: "test-container",
        object: "test-object.txt",
        range: "bytes=0-1023",
      })

      expect(mockCtx.mockSwift.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Range: "bytes=0-1023",
          }),
        })
      )
    })
  })

  describe("createObject", () => {
    it("should successfully create object with ArrayBuffer", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const buffer = new ArrayBuffer(1024)
      const input = {
        container: "test-container",
        object: "new-object.txt",
        content: buffer,
      }

      const result = await caller.objectStorage.createObject(input)

      expect(objectStorageHelpers.buildObjectMetadataHeaders).toHaveBeenCalled()
      expect(mockCtx.mockSwift.put).toHaveBeenCalled()
      expect(result).toEqual(mockObjectMetadata)
    })

    it("should handle base64 string content", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const base64Data = btoa("test content")
      const input = {
        container: "test-container",
        object: "new-object.txt",
        content: base64Data,
      }

      await caller.objectStorage.createObject(input)

      expect(mockCtx.mockSwift.put).toHaveBeenCalled()
    })

    it("should handle metadata during creation", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "test-container",
        object: "new-object.txt",
        content: new ArrayBuffer(1024),
        metadata: { author: "John" },
      }

      await caller.objectStorage.createObject(input)

      expect(objectStorageHelpers.buildObjectMetadataHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { author: "John" },
        })
      )
    })
  })

  describe("getObjectMetadata", () => {
    it("should successfully get object metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.parseObjectMetadata as Mock).mockReturnValue(mockObjectMetadata)

      const input = { container: "test-container", object: "test-object.txt" }
      const result = await caller.objectStorage.getObjectMetadata(input)

      expect(mockCtx.mockSwift.head).toHaveBeenCalled()
      expect(objectStorageHelpers.parseObjectMetadata).toHaveBeenCalled()
      expect(result).toEqual(mockObjectMetadata)
    })
  })

  describe("updateObjectMetadata", () => {
    it("should successfully update object metadata", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "test-container",
        object: "test-object.txt",
        metadata: { version: "2.0" },
      }

      const result = await caller.objectStorage.updateObjectMetadata(input)

      expect(objectStorageHelpers.buildObjectMetadataHeaders).toHaveBeenCalled()
      expect(mockCtx.mockSwift.post).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe("copyObject", () => {
    it("should successfully copy object", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.put.mockResolvedValue({
        ok: true,
        headers: new Headers({
          "Content-Type": "text/plain",
          "Content-Length": "512",
          ETag: "xyz789",
        }),
      })
      ;(objectStorageHelpers.parseObjectMetadata as Mock).mockReturnValue(mockObjectMetadata)

      const input = {
        container: "source-container",
        object: "source-object.txt",
        destination: "/dest-container/dest-object.txt",
      }

      const result = await caller.objectStorage.copyObject(input)

      expect(mockCtx.mockSwift.put).toHaveBeenCalledWith(
        expect.stringContaining("dest-container/dest-object.txt"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Copy-From": "/source-container/source-object.txt",
          }),
        })
      )
      expect(result).toEqual(mockObjectMetadata)
    })

    it("should handle destination account", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "source-container",
        object: "source-object.txt",
        destination: "/dest-container/dest-object.txt",
        destinationAccount: "AUTH_other",
      }

      await caller.objectStorage.copyObject(input)

      expect(mockCtx.mockSwift.put).toHaveBeenCalledWith(
        expect.stringContaining("dest-object.txt"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Copy-From-Account": "AUTH_other",
          }),
        })
      )
    })
  })

  describe("deleteObject", () => {
    it("should successfully delete object", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { container: "test-container", object: "test-object.txt" }
      const result = await caller.objectStorage.deleteObject(input)

      expect(mockCtx.mockSwift.del).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it("should handle multipart manifest deletion", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        container: "test-container",
        object: "large-object",
        multipartManifest: "delete" as const,
      }

      await caller.objectStorage.deleteObject(input)

      expect(mockCtx.mockSwift.del).toHaveBeenCalledWith(expect.stringContaining("multipart-manifest=delete"))
    })
  })

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe("bulkDelete", () => {
    it("should successfully bulk delete objects", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          "Number Deleted": 3,
          "Number Not Found": 0,
          Errors: [],
        }),
      })

      const input = {
        objects: ["/container/obj1.txt", "/container/obj2.txt", "/container/obj3.txt"],
      }

      const result = await caller.objectStorage.bulkDelete(input)

      expect(mockCtx.mockSwift.post).toHaveBeenCalledWith(expect.stringContaining("bulk-delete"), expect.any(Object))
      expect(result.numberDeleted).toBe(3)
      expect(result.numberNotFound).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it("should handle partial failures", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          "Number Deleted": 2,
          "Number Not Found": 0,
          Errors: [["/container/protected.txt", "403 Forbidden"]],
        }),
      })

      const input = {
        objects: ["/container/obj1.txt", "/container/obj2.txt", "/container/protected.txt"],
      }

      const result = await caller.objectStorage.bulkDelete(input)

      expect(result.numberDeleted).toBe(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].path).toBe("/container/protected.txt")
    })
  })

  // ============================================================================
  // FOLDER OPERATIONS
  // ============================================================================

  describe("createFolder", () => {
    it("should successfully create folder", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.normalizeFolderPath as Mock).mockReturnValue("test-folder/")

      const input = { container: "test-container", folderPath: "test-folder" }
      const result = await caller.objectStorage.createFolder(input)

      expect(objectStorageHelpers.normalizeFolderPath).toHaveBeenCalledWith("test-folder")
      expect(mockCtx.mockSwift.put).toHaveBeenCalledWith(
        expect.stringContaining("test-container"),
        expect.objectContaining({
          body: expect.any(ArrayBuffer),
          headers: expect.objectContaining({
            "Content-Type": "application/directory",
            "Content-Length": "0",
          }),
        })
      )
      expect(result).toBe(true)
    })
  })

  describe("listFolderContents", () => {
    it("should successfully list folder contents", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.normalizeFolderPath as Mock).mockReturnValue("folder/")
      ;(objectStorageHelpers.isFolderMarker as Mock).mockReturnValue(false)

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([mockObjectSummary]),
      })

      const input = { container: "test-container", folderPath: "folder" }
      const result = await caller.objectStorage.listFolderContents(input)

      expect(result.objects).toBeDefined()
      expect(result.folders).toBeDefined()
    })

    it("should filter folder markers", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.normalizeFolderPath as Mock).mockReturnValue("")
      ;(objectStorageHelpers.isFolderMarker as Mock).mockImplementation((name, bytes) => {
        return name.endsWith("/") && bytes === 0
      })

      const folderMarker = {
        name: "folder/",
        bytes: 0,
        content_type: "application/directory",
        hash: "d41d8cd98f00b204e9800998ecf8427e",
        last_modified: "2023-01-01T00:00:00Z",
      }
      const regularFile = { ...mockObjectSummary, name: "file.txt" }

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([{ subdir: "folder/" }, folderMarker, regularFile]),
      })

      const input = { container: "test-container" }
      const result = await caller.objectStorage.listFolderContents(input)

      expect(result.folders.length).toBeGreaterThan(0)
      expect(result.objects.length).toBeGreaterThan(0)
    })
  })

  describe("moveFolder", () => {
    it("should successfully move folder", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.normalizeFolderPath as Mock)
        .mockReturnValueOnce("old-folder/")
        .mockReturnValueOnce("new-folder/")

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          { ...mockObjectSummary, name: "old-folder/file1.txt" },
          { ...mockObjectSummary, name: "old-folder/file2.txt" },
        ]),
      })

      const input = {
        container: "test-container",
        sourcePath: "old-folder",
        destinationPath: "new-folder",
      }

      const result = await caller.objectStorage.moveFolder(input)

      expect(result).toBeGreaterThan(0)
      expect(mockCtx.mockSwift.put).toHaveBeenCalled() // For copies
      expect(mockCtx.mockSwift.post).toHaveBeenCalled() // For bulk delete
    })
  })

  describe("deleteFolder", () => {
    it("should successfully delete folder", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.normalizeFolderPath as Mock).mockReturnValue("folder/")

      mockCtx.mockSwift.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          { ...mockObjectSummary, name: "folder/file1.txt" },
          { ...mockObjectSummary, name: "folder/file2.txt" },
        ]),
      })

      mockCtx.mockSwift.post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          "Number Deleted": 2,
          "Number Not Found": 0,
          Errors: [],
        }),
      })

      const input = { container: "test-container", folderPath: "folder" }
      const result = await caller.objectStorage.deleteFolder(input)

      expect(result).toBe(2)
      expect(mockCtx.mockSwift.post).toHaveBeenCalledWith(expect.stringContaining("bulk-delete"), expect.any(Object))
    })
  })

  // ============================================================================
  // TEMP URL OPERATIONS
  // ============================================================================

  describe("generateTempUrl", () => {
    it("should successfully generate temp URL", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.head.mockResolvedValue({
        ok: true,
        headers: new Headers({
          "X-Account-Meta-Temp-URL-Key": "secret-key",
        }),
      })

      const input = {
        container: "test-container",
        object: "test-object.txt",
        method: "GET" as const,
        expiresIn: 3600,
      }

      const result = await caller.objectStorage.generateTempUrl(input)

      expect(objectStorageHelpers.generateTempUrlSignature).toHaveBeenCalled()
      expect(objectStorageHelpers.constructTempUrl).toHaveBeenCalled()
      expect(result.url).toBeDefined()
      expect(result.expiresAt).toBeDefined()
    })

    it("should handle missing temp URL key", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.head.mockResolvedValue({
        ok: true,
        headers: new Headers(),
      })

      const input = {
        container: "test-container",
        object: "test-object.txt",
        method: "GET" as const,
        expiresIn: 3600,
      }

      await expect(caller.objectStorage.generateTempUrl(input)).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Temp URL key not configured for this account or container",
        })
      )
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle Swift service unavailable", async () => {
      const mockCtx = createMockContext(false, true)
      const caller = createCaller(mockCtx)

      ;(objectStorageHelpers.validateSwiftService as Mock).mockImplementation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Swift (Object Storage) service",
        })
      })

      await expect(caller.objectStorage.listContainers({ format: "json" })).rejects.toThrow(
        "Failed to initialize OpenStack Swift (Object Storage) service"
      )
    })

    it("should handle network errors", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockSwift.get.mockRejectedValue(new Error("Network timeout"))

      await expect(caller.objectStorage.listContainers({ format: "json" })).rejects.toThrow()
    })

    it("should handle 404 not found errors", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const mockError = { statusCode: 404, message: "Not Found" }
      mockCtx.mockSwift.get.mockRejectedValue(mockError)

      await expect(caller.objectStorage.getObject({ container: "test", object: "missing.txt" })).rejects.toThrow()
    })
  })
})
