import { describe, it, expect } from "vitest"
import {
  // Account schemas
  accountMetadataSchema,
  accountInfoSchema,
  listContainersInputSchema,
  updateAccountMetadataInputSchema,
  getAccountMetadataInputSchema,
  deleteAccountInputSchema,
  // Container schemas
  containerSummarySchema,
  containerMetadataSchema,
  containerInfoSchema,
  listObjectsInputSchema,
  createContainerInputSchema,
  updateContainerMetadataInputSchema,
  getContainerMetadataInputSchema,
  deleteContainerInputSchema,
  // Object schemas
  objectSummarySchema,
  objectMetadataSchema,
  getObjectInputSchema,
  createObjectInputSchema,
  updateObjectMetadataInputSchema,
  copyObjectInputSchema,
  deleteObjectInputSchema,
  getObjectMetadataInputSchema,
  // Bulk operations
  bulkDeleteInputSchema,
  bulkDeleteResultSchema,
  // Response schemas
  containersResponseSchema,
  objectsResponseSchema,
  accountInfoResponseSchema,
  containerInfoResponseSchema,
  objectMetadataResponseSchema,
  objectContentResponseSchema,
} from "./swift"

describe("Swift Object Storage Schema Validation", () => {
  // Common test data
  const accountName = "AUTH_test-account"
  const containerName = "test-container"
  const objectName = "test-object.txt"

  describe("Account Schemas", () => {
    describe("accountMetadataSchema", () => {
      it("should validate valid metadata", () => {
        const metadata = {
          project: "test-project",
          owner: "john-doe",
          environment: "production",
        }
        const result = accountMetadataSchema.safeParse(metadata)
        expect(result.success).toBe(true)
      })

      it("should validate empty metadata", () => {
        const result = accountMetadataSchema.safeParse({})
        expect(result.success).toBe(true)
      })

      it("should reject non-string values", () => {
        const metadata = {
          key1: "value1",
          key2: 123, // Invalid: number
        }
        const result = accountMetadataSchema.safeParse(metadata)
        expect(result.success).toBe(false)
      })
    })

    describe("accountInfoSchema", () => {
      const minimalAccountInfo = {
        objectCount: 100,
        containerCount: 5,
        bytesUsed: 1073741824, // 1GB
      }

      const completeAccountInfo = {
        objectCount: 100,
        containerCount: 5,
        bytesUsed: 1073741824,
        metadata: {
          project: "test",
          owner: "user",
        },
        quotaBytes: 10737418240, // 10GB
        tempUrlKey: "secret-key-1",
        tempUrlKey2: "secret-key-2",
      }

      it("should validate minimal account info", () => {
        const result = accountInfoSchema.safeParse(minimalAccountInfo)
        expect(result.success).toBe(true)
      })

      it("should validate complete account info", () => {
        const result = accountInfoSchema.safeParse(completeAccountInfo)
        expect(result.success).toBe(true)
      })

      it("should reject missing required fields", () => {
        const invalidInfo = { objectCount: 100 }
        const result = accountInfoSchema.safeParse(invalidInfo)
        expect(result.success).toBe(false)
      })

      it("should reject invalid number types", () => {
        const invalidInfo = {
          ...minimalAccountInfo,
          objectCount: "100", // Should be number
        }
        const result = accountInfoSchema.safeParse(invalidInfo)
        expect(result.success).toBe(false)
      })
    })

    describe("listContainersInputSchema", () => {
      it("should validate minimal input", () => {
        const input = {}
        const result = listContainersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with optional account", () => {
        const input = { account: accountName }
        const result = listContainersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all parameters", () => {
        const input = {
          account: accountName,
          limit: 100,
          marker: "container-50",
          end_marker: "container-99",
          prefix: "backup-",
          delimiter: "/",
          reverse: true,
          format: "json" as const,
          xNewest: true,
        }
        const result = listContainersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject invalid limit values", () => {
        const tooSmall = { limit: 0 }
        const tooLarge = { limit: 10001 }

        expect(listContainersInputSchema.safeParse(tooSmall).success).toBe(false)
        expect(listContainersInputSchema.safeParse(tooLarge).success).toBe(false)
      })

      it("should validate all format values", () => {
        const formats = ["json", "xml", "plain"] as const

        for (const format of formats) {
          const input = { format }
          const result = listContainersInputSchema.safeParse(input)
          expect(result.success).toBe(true)
        }
      })

      it("should default format to json", () => {
        const input = {}
        const result = listContainersInputSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.format).toBe("json")
        }
      })
    })

    describe("updateAccountMetadataInputSchema", () => {
      it("should validate metadata update", () => {
        const input = {
          metadata: {
            project: "new-project",
            owner: "new-owner",
          },
        }
        const result = updateAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with removeMetadata", () => {
        const input = {
          metadata: { newKey: "value" },
          removeMetadata: ["oldKey1", "oldKey2"],
        }
        const result = updateAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with temp URL keys", () => {
        const input = {
          metadata: {},
          tempUrlKey: "new-key-1",
          tempUrlKey2: "new-key-2",
        }
        const result = updateAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject without metadata", () => {
        const input = {}
        const result = updateAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("getAccountMetadataInputSchema", () => {
      it("should validate minimal input", () => {
        const input = {}
        const result = getAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with account", () => {
        const input = { account: accountName }
        const result = getAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with xNewest flag", () => {
        const input = {
          account: accountName,
          xNewest: true,
        }
        const result = getAccountMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("deleteAccountInputSchema", () => {
      it("should validate minimal input", () => {
        const input = {}
        const result = deleteAccountInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with account", () => {
        const input = { account: accountName }
        const result = deleteAccountInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Container Schemas", () => {
    describe("containerMetadataSchema", () => {
      it("should validate valid metadata", () => {
        const metadata = {
          project: "test-project",
          owner: "john-doe",
          environment: "production",
        }
        const result = containerMetadataSchema.safeParse(metadata)
        expect(result.success).toBe(true)
      })

      it("should validate empty metadata", () => {
        const result = containerMetadataSchema.safeParse({})
        expect(result.success).toBe(true)
      })

      it("should reject non-string values", () => {
        const metadata = {
          key1: "value1",
          key2: 123, // Invalid: number
        }
        const result = containerMetadataSchema.safeParse(metadata)
        expect(result.success).toBe(false)
      })
    })
    describe("containerSummarySchema", () => {
      const minimalContainer = {
        name: containerName,
        count: 10,
        bytes: 1048576, // 1MB
      }

      const completeContainer = {
        ...minimalContainer,
        last_modified: "2025-03-01T12:00:00Z",
      }

      it("should validate minimal container summary", () => {
        const result = containerSummarySchema.safeParse(minimalContainer)
        expect(result.success).toBe(true)
      })

      it("should validate complete container summary", () => {
        const result = containerSummarySchema.safeParse(completeContainer)
        expect(result.success).toBe(true)
      })

      it("should reject missing required fields", () => {
        const invalid = { name: containerName }
        const result = containerSummarySchema.safeParse(invalid)
        expect(result.success).toBe(false)
      })
    })

    describe("containerInfoSchema", () => {
      const minimalContainerInfo = {
        objectCount: 10,
        bytesUsed: 1048576,
      }

      const completeContainerInfo = {
        objectCount: 10,
        bytesUsed: 1048576,
        metadata: { project: "test" },
        quotaBytes: 10485760, // 10MB
        quotaCount: 100,
        storagePolicy: "Policy-0",
        versionsLocation: "versions-container",
        historyLocation: "history-container",
        read: ".r:*,.rlistings",
        write: "user1:*,user2:*",
        syncTo: "https://remote.swift/container",
        syncKey: "sync-secret",
        tempUrlKey: "temp-key",
        tempUrlKey2: "temp-key-2",
      }

      it("should validate minimal container info", () => {
        const result = containerInfoSchema.safeParse(minimalContainerInfo)
        expect(result.success).toBe(true)
      })

      it("should validate complete container info", () => {
        const result = containerInfoSchema.safeParse(completeContainerInfo)
        expect(result.success).toBe(true)
      })
    })

    describe("listObjectsInputSchema", () => {
      it("should validate minimal input", () => {
        const input = { container: containerName }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all parameters", () => {
        const input = {
          container: containerName,
          account: accountName,
          limit: 500,
          marker: "object-100",
          end_marker: "object-999",
          prefix: "logs/",
          delimiter: "/",
          path: "documents/2024/",
          reverse: true,
          format: "json" as const,
          xNewest: true,
        }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty container name", () => {
        const input = { container: "" }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject container name longer than 256 chars", () => {
        const input = { container: "a".repeat(257) }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("createContainerInputSchema", () => {
      it("should validate minimal container creation", () => {
        const input = { container: containerName }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all options", () => {
        const input = {
          container: containerName,
          metadata: {
            project: "test",
            environment: "dev",
          },
          read: ".r:*",
          write: "user:*",
          storagePolicy: "Policy-0",
          versionsLocation: "versions",
          historyLocation: "history",
          quotaBytes: 10485760,
          quotaCount: 100,
          tempUrlKey: "key1",
          tempUrlKey2: "key2",
        }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("updateContainerMetadataInputSchema", () => {
      it("should validate metadata update", () => {
        const input = {
          container: containerName,
          metadata: { newKey: "value" },
        }
        const result = updateContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with removal flags", () => {
        const input = {
          container: containerName,
          removeVersionsLocation: true,
          removeHistoryLocation: true,
        }
        const result = updateContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("getContainerMetadataInputSchema", () => {
      it("should validate minimal input", () => {
        const input = { container: containerName }
        const result = getContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with account", () => {
        const input = {
          container: containerName,
          account: accountName,
        }
        const result = getContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with xNewest flag", () => {
        const input = {
          container: containerName,
          xNewest: true,
        }
        const result = getContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("deleteContainerInputSchema", () => {
      it("should validate minimal input", () => {
        const input = { container: containerName }
        const result = deleteContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with account", () => {
        const input = {
          container: containerName,
          account: accountName,
        }
        const result = deleteContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty container name", () => {
        const input = { container: "" }
        const result = deleteContainerInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe("Object Schemas", () => {
    describe("objectSummarySchema", () => {
      const minimalObject = {
        name: objectName,
        hash: "d41d8cd98f00b204e9800998ecf8427e",
        bytes: 1024,
        content_type: "text/plain",
        last_modified: "2025-03-01T12:00:00Z",
      }

      const objectWithSymlink = {
        ...minimalObject,
        symlink_path: "/other-container/target-object",
      }

      it("should validate minimal object summary", () => {
        const result = objectSummarySchema.safeParse(minimalObject)
        expect(result.success).toBe(true)
      })

      it("should validate object with symlink", () => {
        const result = objectSummarySchema.safeParse(objectWithSymlink)
        expect(result.success).toBe(true)
      })

      it("should reject missing required fields", () => {
        const invalid = { name: objectName, hash: "abc" }
        const result = objectSummarySchema.safeParse(invalid)
        expect(result.success).toBe(false)
      })
    })

    describe("objectMetadataSchema", () => {
      const minimalMetadata = {}

      const completeMetadata = {
        contentType: "application/pdf",
        contentLength: 1048576,
        contentEncoding: "gzip",
        contentDisposition: "attachment; filename=document.pdf",
        etag: "d41d8cd98f00b204e9800998ecf8427e",
        lastModified: "2025-03-01T12:00:00Z",
        deleteAt: 1735689600, // Unix timestamp
        customMetadata: {
          author: "John Doe",
          version: "1.0",
        },
        objectManifest: "/segments-container/prefix",
        staticLargeObject: true,
        symlinkTarget: "/target-container/target-object",
        symlinkTargetAccount: "AUTH_other-account",
      }

      it("should validate minimal metadata", () => {
        const result = objectMetadataSchema.safeParse(minimalMetadata)
        expect(result.success).toBe(true)
      })

      it("should validate complete metadata", () => {
        const result = objectMetadataSchema.safeParse(completeMetadata)
        expect(result.success).toBe(true)
      })
    })

    describe("getObjectInputSchema", () => {
      it("should validate minimal input", () => {
        const input = {
          container: containerName,
          object: objectName,
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all parameters", () => {
        const input = {
          container: containerName,
          object: objectName,
          account: accountName,
          range: "bytes=0-1023",
          ifMatch: '"etag-value"',
          ifNoneMatch: '"old-etag"',
          ifModifiedSince: "Wed, 01 Mar 2025 12:00:00 GMT",
          ifUnmodifiedSince: "Thu, 02 Mar 2025 12:00:00 GMT",
          multipartManifest: "get" as const,
          symlink: "get" as const,
          xNewest: true,
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty object name", () => {
        const input = {
          container: containerName,
          object: "",
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("createObjectInputSchema", () => {
      it("should validate with ArrayBuffer", () => {
        const buffer = new ArrayBuffer(1024)
        const input = {
          container: containerName,
          object: objectName,
          content: buffer,
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with Uint8Array", () => {
        const array = new Uint8Array(1024)
        const input = {
          container: containerName,
          object: objectName,
          content: array,
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with string (base64)", () => {
        const input = {
          container: containerName,
          object: objectName,
          content: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all options", () => {
        const input = {
          container: containerName,
          object: objectName,
          content: new ArrayBuffer(1024),
          contentType: "application/json",
          contentEncoding: "gzip",
          contentDisposition: "attachment; filename=data.json",
          etag: "d41d8cd98f00b204e9800998ecf8427e",
          deleteAt: 1735689600,
          deleteAfter: 86400, // 24 hours
          metadata: {
            author: "John",
            version: "2.0",
          },
          objectManifest: "/segments/prefix",
          multipartManifest: "put" as const,
          detectContentType: true,
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate copy operation", () => {
        const input = {
          container: containerName,
          object: objectName,
          content: "", // Empty for copy
          copyFrom: "/source-container/source-object",
          copyFromAccount: "AUTH_other-account",
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate symlink creation", () => {
        const input = {
          container: containerName,
          object: "link-object",
          content: "", // Empty for symlink
          symlinkTarget: "/target-container/target-object",
          symlinkTargetAccount: "AUTH_target-account",
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject missing content", () => {
        const input = {
          container: containerName,
          object: objectName,
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("copyObjectInputSchema", () => {
      it("should validate minimal copy", () => {
        const input = {
          container: containerName,
          object: objectName,
          destination: "/dest-container/dest-object",
        }
        const result = copyObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all options", () => {
        const input = {
          container: containerName,
          object: objectName,
          destination: "/dest-container/dest-object",
          destinationAccount: "AUTH_dest-account",
          metadata: {
            copied: "true",
            timestamp: "2025-03-01",
          },
          contentType: "application/pdf",
          contentEncoding: "gzip",
          contentDisposition: "attachment",
          freshMetadata: true,
          multipartManifest: "get" as const,
          symlink: "get" as const,
        }
        const result = copyObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject missing destination", () => {
        const input = {
          container: containerName,
          object: objectName,
        }
        const result = copyObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("updateObjectMetadataInputSchema", () => {
      it("should validate metadata update", () => {
        const input = {
          container: containerName,
          object: objectName,
          metadata: {
            version: "2.0",
            updated: "2025-03-01",
          },
        }
        const result = updateObjectMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with lifecycle settings", () => {
        const input = {
          container: containerName,
          object: objectName,
          deleteAt: 1735689600,
          deleteAfter: 86400,
        }
        const result = updateObjectMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("getObjectMetadataInputSchema", () => {
      it("should validate minimal input", () => {
        const input = {
          container: containerName,
          object: objectName,
        }
        const result = getObjectMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with all optional parameters", () => {
        const input = {
          container: containerName,
          object: objectName,
          account: accountName,
          multipartManifest: "get" as const,
          symlink: "get" as const,
          xNewest: true,
          ifMatch: '"etag-value"',
          ifNoneMatch: '"old-etag"',
          ifModifiedSince: "Wed, 01 Mar 2025 12:00:00 GMT",
          ifUnmodifiedSince: "Thu, 02 Mar 2025 12:00:00 GMT",
        }
        const result = getObjectMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty object name", () => {
        const input = {
          container: containerName,
          object: "",
        }
        const result = getObjectMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("deleteObjectInputSchema", () => {
      it("should validate basic delete", () => {
        const input = {
          container: containerName,
          object: objectName,
        }
        const result = deleteObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate with multipart manifest deletion", () => {
        const input = {
          container: containerName,
          object: objectName,
          multipartManifest: "delete" as const,
        }
        const result = deleteObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Bulk Operations", () => {
    describe("bulkDeleteInputSchema", () => {
      it("should validate bulk delete with single object", () => {
        const input = {
          objects: [`/${containerName}/${objectName}`],
        }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate bulk delete with multiple objects", () => {
        const input = {
          objects: [`/container1/object1.txt`, `/container1/object2.txt`, `/container2/object3.txt`],
        }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should validate bulk delete with max objects (10000)", () => {
        const objects = Array.from({ length: 10000 }, (_, i) => `/container/object${i}.txt`)
        const input = { objects }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty array", () => {
        const input = { objects: [] }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject more than 10000 objects", () => {
        const objects = Array.from({ length: 10001 }, (_, i) => `/container/object${i}.txt`)
        const input = { objects }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should validate with account parameter", () => {
        const input = {
          account: accountName,
          objects: [`/${containerName}/object1.txt`, `/${containerName}/object2.txt`],
        }
        const result = bulkDeleteInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("bulkDeleteResultSchema", () => {
      it("should validate successful bulk delete result", () => {
        const result = {
          numberDeleted: 5,
          numberNotFound: 0,
          errors: [],
        }
        const parseResult = bulkDeleteResultSchema.safeParse(result)
        expect(parseResult.success).toBe(true)
      })

      it("should validate result with errors", () => {
        const result = {
          numberDeleted: 3,
          numberNotFound: 2,
          errors: [
            {
              path: "/container/protected-object.txt",
              status: "403",
              error: "Forbidden",
            },
            {
              path: "/container/locked-object.txt",
              status: "409",
              error: "Conflict",
            },
          ],
        }
        const parseResult = bulkDeleteResultSchema.safeParse(result)
        expect(parseResult.success).toBe(true)
      })

      it("should reject missing required fields", () => {
        const result = {
          numberDeleted: 5,
        }
        const parseResult = bulkDeleteResultSchema.safeParse(result)
        expect(parseResult.success).toBe(false)
      })
    })
  })

  describe("Response Schemas", () => {
    describe("containersResponseSchema", () => {
      it("should validate empty containers list", () => {
        const result = containersResponseSchema.safeParse([])
        expect(result.success).toBe(true)
      })

      it("should validate list of containers", () => {
        const containers = [
          {
            name: "container1",
            count: 10,
            bytes: 1024,
            last_modified: "2025-03-01T12:00:00Z",
          },
          {
            name: "container2",
            count: 5,
            bytes: 512,
          },
        ]
        const result = containersResponseSchema.safeParse(containers)
        expect(result.success).toBe(true)
      })
    })

    describe("objectsResponseSchema", () => {
      it("should validate empty objects list", () => {
        const result = objectsResponseSchema.safeParse([])
        expect(result.success).toBe(true)
      })

      it("should validate list of objects", () => {
        const objects = [
          {
            name: "object1.txt",
            hash: "d41d8cd98f00b204e9800998ecf8427e",
            bytes: 1024,
            content_type: "text/plain",
            last_modified: "2025-03-01T12:00:00Z",
          },
          {
            name: "object2.txt",
            hash: "098f6bcd4621d373cade4e832627b4f6",
            bytes: 2048,
            content_type: "text/plain",
            last_modified: "2025-03-02T12:00:00Z",
            symlink_path: "/other/target",
          },
        ]
        const result = objectsResponseSchema.safeParse(objects)
        expect(result.success).toBe(true)
      })
    })

    describe("objectContentResponseSchema", () => {
      it("should validate with ArrayBuffer content", () => {
        const response = {
          content: new ArrayBuffer(1024),
          metadata: {
            contentType: "text/plain",
            contentLength: 1024,
          },
        }
        const result = objectContentResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      })

      it("should validate with Uint8Array content", () => {
        const response = {
          content: new Uint8Array(1024),
          metadata: {
            contentType: "application/octet-stream",
          },
        }
        const result = objectContentResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      })

      it("should reject string content", () => {
        const response = {
          content: "text content",
          metadata: {},
        }
        const result = objectContentResponseSchema.safeParse(response)
        expect(result.success).toBe(false)
      })
    })

    describe("accountInfoResponseSchema", () => {
      it("should validate account info response", () => {
        const response = {
          objectCount: 100,
          containerCount: 5,
          bytesUsed: 1073741824,
          metadata: { project: "test" },
          quotaBytes: 10737418240,
          tempUrlKey: "key1",
          tempUrlKey2: "key2",
        }
        const result = accountInfoResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      })
    })

    describe("containerInfoResponseSchema", () => {
      it("should validate container info response", () => {
        const response = {
          objectCount: 10,
          bytesUsed: 1048576,
          metadata: { project: "test" },
          quotaBytes: 10485760,
          storagePolicy: "Policy-0",
        }
        const result = containerInfoResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      })
    })

    describe("objectMetadataResponseSchema", () => {
      it("should validate object metadata response", () => {
        const response = {
          contentType: "text/plain",
          contentLength: 1024,
          etag: "d41d8cd98f00b204e9800998ecf8427e",
          lastModified: "2025-03-01T12:00:00Z",
          customMetadata: {
            author: "John",
          },
        }
        const result = objectMetadataResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("Edge Cases and Validation Rules", () => {
    describe("Container Name Validation", () => {
      it("should accept container name with 1 character", () => {
        const input = { container: "a" }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should accept container name with 256 characters", () => {
        const input = { container: "a".repeat(256) }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject container name with 257 characters", () => {
        const input = { container: "a".repeat(257) }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should accept container with special characters and hyphens", () => {
        const input = { container: "test-container_123.backup" }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    describe("Object Name Validation", () => {
      it("should accept object with 1 character", () => {
        const input = {
          container: containerName,
          object: "x",
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should accept object with path separators and special chars", () => {
        const input = {
          container: containerName,
          object: "path/to/deeply/nested/object-v2.1_final.txt",
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject empty object name", () => {
        const input = {
          container: containerName,
          object: "",
        }
        const result = getObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Pagination Parameters", () => {
      it("should accept limit of 1", () => {
        const input = { container: containerName, limit: 1 }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should accept limit of 10000", () => {
        const input = { container: containerName, limit: 10000 }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject limit of 0", () => {
        const input = { container: containerName, limit: 0 }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject limit greater than 10000", () => {
        const input = { container: containerName, limit: 10001 }
        const result = listObjectsInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Binary Content Validation", () => {
      it("should accept various binary content types", () => {
        const buffer = new ArrayBuffer(1024)
        const array = new Uint8Array(1024)
        const base64 = "SGVsbG8gV29ybGQ="

        const inputs = [
          { container: containerName, object: "file1", content: buffer },
          { container: containerName, object: "file2", content: array },
          { container: containerName, object: "file3", content: base64 },
        ]

        for (const input of inputs) {
          const result = createObjectInputSchema.safeParse(input)
          expect(result.success).toBe(true)
        }
      })

      it("should reject number as content", () => {
        const input = {
          container: containerName,
          object: objectName,
          content: 12345,
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it("should reject object as content", () => {
        const input = {
          container: containerName,
          object: objectName,
          content: { data: "test" },
        }
        const result = createObjectInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Metadata Record Validation", () => {
      it("should accept various string key-value pairs in metadata", () => {
        const input = {
          container: containerName,
          metadata: {
            "X-Custom-Header": "value",
            project: "test",
            environment: "production",
            "key-with-dashes": "value",
            key_with_underscores: "value",
          },
        }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should reject non-string metadata values", () => {
        const input = {
          container: containerName,
          metadata: {
            key1: "valid",
            key2: 123, // Invalid
          },
        }
        const result = createContainerInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })

    describe("Optional Field Behavior", () => {
      it("should not require optional fields", () => {
        const minimalInput = { container: containerName }
        const result = getContainerMetadataInputSchema.safeParse(minimalInput)
        expect(result.success).toBe(true)
      })

      it("should preserve undefined optional fields", () => {
        const input = {
          container: containerName,
          xNewest: undefined,
        }
        const result = getContainerMetadataInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it("should accept null for optional nullable fields in schemas that allow it", () => {
        const containerSummary = {
          name: "test",
          count: 0,
          bytes: 0,
          last_modified: undefined,
        }
        const result = containerSummarySchema.safeParse(containerSummary)
        expect(result.success).toBe(true)
      })
    })
  })
})
