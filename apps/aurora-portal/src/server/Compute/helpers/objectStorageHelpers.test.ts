import { describe, it, expect, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { ZodError, z } from "zod"
import {
  validateSwiftService,
  applyContainerQueryParams,
  applyObjectQueryParams,
  parseAccountInfo,
  parseContainerInfo,
  parseObjectMetadata,
  buildAccountMetadataHeaders,
  buildContainerMetadataHeaders,
  buildObjectMetadataHeaders,
  mapErrorResponseToTRPCError,
  handleZodParsingError,
  wrapError,
  withErrorHandling,
} from "./objectStorageHelpers"
import type { ListContainersInput, ListObjectsInput } from "../types/objectStorage"

describe("objectStorageHelpers", () => {
  describe("validateSwiftService", () => {
    it("should not throw when service is provided", () => {
      const mockService = { endpoint: "https://swift.example.com" }

      expect(() => validateSwiftService(mockService)).not.toThrow()
    })

    it("should throw INTERNAL_SERVER_ERROR when service is null", () => {
      expect(() => validateSwiftService(null)).toThrow(TRPCError)

      try {
        validateSwiftService(null)
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR")
        expect((error as TRPCError).message).toBe("Failed to initialize OpenStack Swift (Object Storage) service")
      }
    })

    it("should throw INTERNAL_SERVER_ERROR when service is undefined", () => {
      expect(() => validateSwiftService(undefined)).toThrow(TRPCError)

      try {
        validateSwiftService(undefined)
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR")
      }
    })
  })

  describe("applyContainerQueryParams", () => {
    let queryParams: URLSearchParams

    beforeEach(() => {
      queryParams = new URLSearchParams()
    })

    it("should apply limit parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        limit: 100,
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("limit")).toBe("100")
    })

    it("should apply marker parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        marker: "container-50",
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("marker")).toBe("container-50")
    })

    it("should apply end_marker parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        end_marker: "container-99",
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("end_marker")).toBe("container-99")
    })

    it("should apply prefix parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        prefix: "backup-",
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("prefix")).toBe("backup-")
    })

    it("should apply delimiter parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        delimiter: "/",
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("delimiter")).toBe("/")
    })

    it("should apply reverse parameter as true", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        reverse: true,
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("reverse")).toBe("true")
    })

    it("should apply reverse parameter as false", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        reverse: false,
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("reverse")).toBe("false")
    })

    it("should apply format parameter", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("format")).toBe("json")
    })

    it("should apply all parameters together", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        limit: 50,
        marker: "container-10",
        end_marker: "container-60",
        prefix: "test-",
        delimiter: "/",
        reverse: true,
        format: "xml",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.get("limit")).toBe("50")
      expect(queryParams.get("marker")).toBe("container-10")
      expect(queryParams.get("end_marker")).toBe("container-60")
      expect(queryParams.get("prefix")).toBe("test-")
      expect(queryParams.get("delimiter")).toBe("/")
      expect(queryParams.get("reverse")).toBe("true")
      expect(queryParams.get("format")).toBe("xml")
    })

    it("should not add undefined parameters", () => {
      const input: Omit<ListContainersInput, "account" | "xNewest"> = {
        limit: 100,
        format: "json",
      }

      applyContainerQueryParams(queryParams, input)

      expect(queryParams.has("marker")).toBe(false)
      expect(queryParams.has("prefix")).toBe(false)
      expect(queryParams.has("delimiter")).toBe(false)
    })
  })

  describe("applyObjectQueryParams", () => {
    let queryParams: URLSearchParams

    beforeEach(() => {
      queryParams = new URLSearchParams()
    })

    it("should apply limit parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        limit: 500,
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("limit")).toBe("500")
    })

    it("should apply marker parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        marker: "object-100",
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("marker")).toBe("object-100")
    })

    it("should apply end_marker parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        end_marker: "object-999",
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("end_marker")).toBe("object-999")
    })

    it("should apply prefix parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        prefix: "logs/2024/",
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("prefix")).toBe("logs/2024/")
    })

    it("should apply delimiter parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        delimiter: "/",
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("delimiter")).toBe("/")
    })

    it("should apply path parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        path: "documents/2024/",
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("path")).toBe("documents/2024/")
    })

    it("should apply reverse parameter as true", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        reverse: true,
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("reverse")).toBe("true")
    })

    it("should apply reverse parameter as false", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        reverse: false,
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("reverse")).toBe("false")
    })

    it("should apply format parameter", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        format: "plain",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("format")).toBe("plain")
    })

    it("should apply all parameters together", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        limit: 100,
        marker: "obj-50",
        end_marker: "obj-150",
        prefix: "data/",
        delimiter: "/",
        path: "archive/",
        reverse: false,
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.get("limit")).toBe("100")
      expect(queryParams.get("marker")).toBe("obj-50")
      expect(queryParams.get("end_marker")).toBe("obj-150")
      expect(queryParams.get("prefix")).toBe("data/")
      expect(queryParams.get("delimiter")).toBe("/")
      expect(queryParams.get("path")).toBe("archive/")
      expect(queryParams.get("reverse")).toBe("false")
      expect(queryParams.get("format")).toBe("json")
    })

    it("should not add undefined parameters", () => {
      const input: Omit<ListObjectsInput, "container" | "account" | "xNewest"> = {
        limit: 100,
        format: "json",
      }

      applyObjectQueryParams(queryParams, input)

      expect(queryParams.has("marker")).toBe(false)
      expect(queryParams.has("prefix")).toBe(false)
      expect(queryParams.has("path")).toBe(false)
    })
  })

  describe("parseAccountInfo", () => {
    it("should parse account info from headers", () => {
      const headers = new Headers({
        "X-Account-Object-Count": "150",
        "X-Account-Container-Count": "10",
        "X-Account-Bytes-Used": "1073741824",
        "X-Account-Meta-Project": "test-project",
        "X-Account-Meta-Owner": "john-doe",
      })

      const result = parseAccountInfo(headers)

      expect(result.objectCount).toBe(150)
      expect(result.containerCount).toBe(10)
      expect(result.bytesUsed).toBe(1073741824)
      expect(result.metadata).toEqual({
        project: "test-project",
        owner: "john-doe",
      })
    })

    it("should parse quota bytes", () => {
      const headers = new Headers({
        "X-Account-Object-Count": "100",
        "X-Account-Container-Count": "5",
        "X-Account-Bytes-Used": "1024",
        "X-Account-Meta-Quota-Bytes": "10737418240",
      })

      const result = parseAccountInfo(headers)

      expect(result.quotaBytes).toBe(10737418240)
    })

    it("should parse temp URL keys", () => {
      const headers = new Headers({
        "X-Account-Object-Count": "100",
        "X-Account-Container-Count": "5",
        "X-Account-Bytes-Used": "1024",
        "X-Account-Meta-Temp-URL-Key": "secret-key-1",
        "X-Account-Meta-Temp-URL-Key-2": "secret-key-2",
      })

      const result = parseAccountInfo(headers)

      expect(result.tempUrlKey).toBe("secret-key-1")
      expect(result.tempUrlKey2).toBe("secret-key-2")
    })

    it("should return empty metadata when no metadata headers present", () => {
      const headers = new Headers({
        "X-Account-Object-Count": "0",
        "X-Account-Container-Count": "0",
        "X-Account-Bytes-Used": "0",
      })

      const result = parseAccountInfo(headers)

      expect(result.metadata).toBeUndefined()
    })

    it("should handle case-insensitive headers", () => {
      const headers = new Headers({
        "x-account-object-count": "50",
        "x-account-container-count": "3",
        "x-account-bytes-used": "512",
      })

      const result = parseAccountInfo(headers)

      expect(result.objectCount).toBe(50)
      expect(result.containerCount).toBe(3)
      expect(result.bytesUsed).toBe(512)
    })
  })

  describe("parseContainerInfo", () => {
    it("should parse container info from headers", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "25",
        "X-Container-Bytes-Used": "2048576",
        "X-Container-Meta-Project": "test",
        "X-Container-Meta-Environment": "production",
      })

      const result = parseContainerInfo(headers)

      expect(result.objectCount).toBe(25)
      expect(result.bytesUsed).toBe(2048576)
      expect(result.metadata).toEqual({
        project: "test",
        environment: "production",
      })
    })

    it("should parse quota settings", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Container-Meta-Quota-Bytes": "10485760",
        "X-Container-Meta-Quota-Count": "100",
      })

      const result = parseContainerInfo(headers)

      expect(result.quotaBytes).toBe(10485760)
      expect(result.quotaCount).toBe(100)
    })

    it("should parse storage policy", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Storage-Policy": "Policy-0",
      })

      const result = parseContainerInfo(headers)

      expect(result.storagePolicy).toBe("Policy-0")
    })

    it("should parse ACL headers", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Container-Read": ".r:*,.rlistings",
        "X-Container-Write": "user1:*,user2:*",
      })

      const result = parseContainerInfo(headers)

      expect(result.read).toBe(".r:*,.rlistings")
      expect(result.write).toBe("user1:*,user2:*")
    })

    it("should parse versioning headers", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Versions-Location": "versions-container",
        "X-History-Location": "history-container",
      })

      const result = parseContainerInfo(headers)

      expect(result.versionsLocation).toBe("versions-container")
      expect(result.historyLocation).toBe("history-container")
    })

    it("should parse sync headers", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Container-Sync-To": "https://remote.swift/container",
        "X-Container-Sync-Key": "sync-secret",
      })

      const result = parseContainerInfo(headers)

      expect(result.syncTo).toBe("https://remote.swift/container")
      expect(result.syncKey).toBe("sync-secret")
    })

    it("should parse temp URL keys", () => {
      const headers = new Headers({
        "X-Container-Object-Count": "10",
        "X-Container-Bytes-Used": "1024",
        "X-Container-Meta-Temp-URL-Key": "container-key",
        "X-Container-Meta-Temp-URL-Key-2": "container-key-2",
      })

      const result = parseContainerInfo(headers)

      expect(result.tempUrlKey).toBe("container-key")
      expect(result.tempUrlKey2).toBe("container-key-2")
    })
  })

  describe("parseObjectMetadata", () => {
    it("should parse object metadata from headers", () => {
      const headers = new Headers({
        "Content-Type": "application/pdf",
        "Content-Length": "1048576",
        ETag: "d41d8cd98f00b204e9800998ecf8427e",
        "Last-Modified": "Wed, 01 Mar 2025 12:00:00 GMT",
        "X-Object-Meta-Author": "John Doe",
        "X-Object-Meta-Version": "1.0",
      })

      const result = parseObjectMetadata(headers)

      expect(result.contentType).toBe("application/pdf")
      expect(result.contentLength).toBe(1048576)
      expect(result.etag).toBe("d41d8cd98f00b204e9800998ecf8427e")
      expect(result.lastModified).toBe("Wed, 01 Mar 2025 12:00:00 GMT")
      expect(result.customMetadata).toEqual({
        author: "John Doe",
        version: "1.0",
      })
    })

    it("should parse content encoding and disposition", () => {
      const headers = new Headers({
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip",
        "Content-Disposition": "attachment; filename=document.txt",
      })

      const result = parseObjectMetadata(headers)

      expect(result.contentEncoding).toBe("gzip")
      expect(result.contentDisposition).toBe("attachment; filename=document.txt")
    })

    it("should parse delete-at timestamp", () => {
      const headers = new Headers({
        "Content-Type": "text/plain",
        "X-Delete-At": "1735689600",
      })

      const result = parseObjectMetadata(headers)

      expect(result.deleteAt).toBe(1735689600)
    })

    it("should parse large object headers", () => {
      const headers = new Headers({
        "Content-Type": "application/octet-stream",
        "X-Object-Manifest": "/segments-container/prefix",
        "X-Static-Large-Object": "true",
      })

      const result = parseObjectMetadata(headers)

      expect(result.objectManifest).toBe("/segments-container/prefix")
      expect(result.staticLargeObject).toBe(true)
    })

    it("should parse symlink headers", () => {
      const headers = new Headers({
        "Content-Type": "application/symlink",
        "X-Symlink-Target": "/target-container/target-object",
        "X-Symlink-Target-Account": "AUTH_other-account",
      })

      const result = parseObjectMetadata(headers)

      expect(result.symlinkTarget).toBe("/target-container/target-object")
      expect(result.symlinkTargetAccount).toBe("AUTH_other-account")
    })

    it("should return undefined for missing optional fields", () => {
      const headers = new Headers({
        "Content-Type": "text/plain",
      })

      const result = parseObjectMetadata(headers)

      expect(result.contentLength).toBeUndefined()
      expect(result.etag).toBeUndefined()
      expect(result.customMetadata).toBeUndefined()
    })
  })

  describe("buildAccountMetadataHeaders", () => {
    it("should build metadata headers", () => {
      const metadata = {
        project: "new-project",
        owner: "jane-doe",
      }

      const headers = buildAccountMetadataHeaders(metadata)

      expect(headers["X-Account-Meta-project"]).toBe("new-project")
      expect(headers["X-Account-Meta-owner"]).toBe("jane-doe")
    })

    it("should build remove metadata headers", () => {
      const headers = buildAccountMetadataHeaders(undefined, ["oldKey1", "oldKey2"])

      expect(headers["X-Remove-Account-Meta-oldKey1"]).toBe("x")
      expect(headers["X-Remove-Account-Meta-oldKey2"]).toBe("x")
    })

    it("should build temp URL key headers", () => {
      const headers = buildAccountMetadataHeaders(undefined, undefined, "new-key-1", "new-key-2")

      expect(headers["X-Account-Meta-Temp-URL-Key"]).toBe("new-key-1")
      expect(headers["X-Account-Meta-Temp-URL-Key-2"]).toBe("new-key-2")
    })

    it("should build all header types together", () => {
      const metadata = { newKey: "value" }
      const removeMetadata = ["oldKey"]
      const tempUrlKey = "key1"
      const tempUrlKey2 = "key2"

      const headers = buildAccountMetadataHeaders(metadata, removeMetadata, tempUrlKey, tempUrlKey2)

      expect(headers["X-Account-Meta-newKey"]).toBe("value")
      expect(headers["X-Remove-Account-Meta-oldKey"]).toBe("x")
      expect(headers["X-Account-Meta-Temp-URL-Key"]).toBe("key1")
      expect(headers["X-Account-Meta-Temp-URL-Key-2"]).toBe("key2")
    })

    it("should return empty object when no parameters provided", () => {
      const headers = buildAccountMetadataHeaders()

      expect(Object.keys(headers)).toHaveLength(0)
    })
  })

  describe("buildContainerMetadataHeaders", () => {
    it("should build metadata headers", () => {
      const options = {
        metadata: {
          project: "test",
          environment: "dev",
        },
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Container-Meta-project"]).toBe("test")
      expect(headers["X-Container-Meta-environment"]).toBe("dev")
    })

    it("should build remove metadata headers", () => {
      const options = {
        removeMetadata: ["key1", "key2"],
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Remove-Container-Meta-key1"]).toBe("x")
      expect(headers["X-Remove-Container-Meta-key2"]).toBe("x")
    })

    it("should build ACL headers", () => {
      const options = {
        read: ".r:*",
        write: "user:*",
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Container-Read"]).toBe(".r:*")
      expect(headers["X-Container-Write"]).toBe("user:*")
    })

    it("should build versioning headers", () => {
      const options = {
        versionsLocation: "versions",
        historyLocation: "history",
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Versions-Location"]).toBe("versions")
      expect(headers["X-History-Location"]).toBe("history")
    })

    it("should build remove versioning headers", () => {
      const options = {
        removeVersionsLocation: true,
        removeHistoryLocation: true,
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Remove-Versions-Location"]).toBe("x")
      expect(headers["X-Remove-History-Location"]).toBe("x")
    })

    it("should build quota headers", () => {
      const options = {
        quotaBytes: 10485760,
        quotaCount: 100,
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Container-Meta-Quota-Bytes"]).toBe("10485760")
      expect(headers["X-Container-Meta-Quota-Count"]).toBe("100")
    })

    it("should build temp URL key headers", () => {
      const options = {
        tempUrlKey: "key1",
        tempUrlKey2: "key2",
      }

      const headers = buildContainerMetadataHeaders(options)

      expect(headers["X-Container-Meta-Temp-URL-Key"]).toBe("key1")
      expect(headers["X-Container-Meta-Temp-URL-Key-2"]).toBe("key2")
    })
  })

  describe("buildObjectMetadataHeaders", () => {
    it("should build metadata headers", () => {
      const options = {
        metadata: {
          author: "John",
          version: "2.0",
        },
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["X-Object-Meta-author"]).toBe("John")
      expect(headers["X-Object-Meta-version"]).toBe("2.0")
    })

    it("should build content type header", () => {
      const options = {
        contentType: "application/json",
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["Content-Type"]).toBe("application/json")
    })

    it("should build content encoding header", () => {
      const options = {
        contentEncoding: "gzip",
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["Content-Encoding"]).toBe("gzip")
    })

    it("should build content disposition header", () => {
      const options = {
        contentDisposition: "attachment; filename=data.json",
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["Content-Disposition"]).toBe("attachment; filename=data.json")
    })

    it("should build delete-at header", () => {
      const options = {
        deleteAt: 1735689600,
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["X-Delete-At"]).toBe("1735689600")
    })

    it("should build delete-after header", () => {
      const options = {
        deleteAfter: 86400,
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["X-Delete-After"]).toBe("86400")
    })

    it("should build all header types together", () => {
      const options = {
        metadata: { key: "value" },
        contentType: "text/plain",
        contentEncoding: "gzip",
        contentDisposition: "attachment",
        deleteAt: 1735689600,
      }

      const headers = buildObjectMetadataHeaders(options)

      expect(headers["X-Object-Meta-key"]).toBe("value")
      expect(headers["Content-Type"]).toBe("text/plain")
      expect(headers["Content-Encoding"]).toBe("gzip")
      expect(headers["Content-Disposition"]).toBe("attachment")
      expect(headers["X-Delete-At"]).toBe("1735689600")
    })
  })

  describe("mapErrorResponseToTRPCError", () => {
    it("should map 400 status to BAD_REQUEST", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 400,
        message: "Bad Request",
      }
      const context = { operation: "create container", container: "test-container" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("BAD_REQUEST")
      expect(error.message).toBe("Failed to create container container: test-container")
    })

    it("should map 401 status to UNAUTHORIZED", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 401,
        message: "Unauthorized",
      }
      const context = { operation: "list containers" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("UNAUTHORIZED")
      expect(error.message).toBe("Unauthorized - cannot list containers")
    })

    it("should map 403 status to FORBIDDEN", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 403,
        message: "Forbidden",
      }
      const context = { operation: "delete container", container: "protected" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("FORBIDDEN")
      expect(error.message).toBe("Access forbidden - cannot delete container container: protected")
    })

    it("should map 404 status to NOT_FOUND", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 404,
        message: "Not Found",
      }
      const context = { operation: "get object", container: "test", object: "file.txt" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("NOT_FOUND")
      expect(error.message).toBe("Resource not found container: test, object: file.txt")
    })

    it("should map 409 status to CONFLICT", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 409,
        message: "Conflict",
      }
      const context = { operation: "delete container", container: "not-empty" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("CONFLICT")
      expect(error.message).toBe("Conflict - delete container container: not-empty")
    })

    it("should map 413 status to PAYLOAD_TOO_LARGE", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 413,
        message: "Payload Too Large",
      }
      const context = { operation: "upload object", object: "large-file.zip" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("PAYLOAD_TOO_LARGE")
      expect(error.message).toBe("Request entity too large, object: large-file.zip")
    })

    it("should map 422 status to BAD_REQUEST", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 422,
        message: "Unprocessable Entity",
      }
      const context = { operation: "upload object", object: "file.txt" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("BAD_REQUEST")
      expect(error.message).toBe("Unprocessable entity - ETag mismatch, object: file.txt")
    })

    it("should map 500 status to INTERNAL_SERVER_ERROR", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 500,
        message: "Internal Server Error",
      }
      const context = { operation: "create container" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Failed to create container: Internal Server Error")
    })

    it("should handle missing status text", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 500,
        message: "",
      }
      const context = { operation: "upload object" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Failed to upload object: Unknown error")
    })

    it("should include additional info when provided", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 400,
        message: "Bad Request",
      }
      const context = {
        operation: "create object",
        object: "file.txt",
        additionalInfo: "Invalid ETag",
      }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.message).toBe("Failed to create object, object: file.txt - Invalid ETag")
    })

    it("should handle context with all fields", () => {
      const errorResponse = {
        name: "SignalOpenstackApiError",
        statusCode: 404,
        message: "Not Found",
      }
      const context = {
        operation: "get object",
        container: "my-container",
        object: "my-object.txt",
        account: "AUTH_test",
      }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.message).toContain("my-container")
      expect(error.message).toContain("my-object.txt")
    })
  })

  describe("handleZodParsingError", () => {
    it("should handle ZodError with field paths", () => {
      const schema = z.object({
        name: z.string(),
        count: z.number(),
      })

      try {
        schema.parse({ name: 123, count: "invalid" })
      } catch (err) {
        const error = handleZodParsingError(err as ZodError, "create container")

        expect(error).toBeInstanceOf(TRPCError)
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        expect(error.message).toContain("create container")
        expect(error.message).toContain("Invalid response format")
      }
    })

    it("should format multiple validation errors", () => {
      const schema = z.object({
        field1: z.string(),
        field2: z.number(),
        field3: z.boolean(),
      })

      try {
        schema.parse({ field1: 123, field2: "abc", field3: "not-bool" })
      } catch (err) {
        const error = handleZodParsingError(err as ZodError, "test operation")

        expect(error.message).toContain("test operation")
        expect(error.message).toContain("Invalid response format")
      }
    })
  })

  describe("wrapError", () => {
    it("should wrap Error object", () => {
      const originalError = new Error("Original error message")
      const operation = "upload object"

      const error = wrapError(originalError, operation)

      expect(error).toBeInstanceOf(TRPCError)
      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Error during upload object: Original error message")
    })

    it("should wrap string error", () => {
      const errorMessage = "Something went wrong"
      const operation = "delete container"

      const error = wrapError(errorMessage, operation)

      expect(error).toBeInstanceOf(TRPCError)
      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Error during delete container")
    })

    it("should handle empty error message", () => {
      const originalError = new Error("")
      const operation = "list objects"

      const error = wrapError(originalError, operation)

      expect(error.message).toBe("Error during list objects")
    })
  })

  describe("withErrorHandling", () => {
    it("should return result when operation succeeds", async () => {
      const operation = async () => "success result"

      const result = await withErrorHandling(operation, "test operation")

      expect(result).toBe("success result")
    })

    it("should wrap thrown errors", async () => {
      const operation = async () => {
        throw new Error("Operation failed")
      }

      await expect(withErrorHandling(operation, "test operation")).rejects.toThrow(TRPCError)

      try {
        await withErrorHandling(operation, "test operation")
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR")
        expect((error as TRPCError).message).toContain("test operation")
        expect((error as TRPCError).message).toContain("Operation failed")
      }
    })

    it("should pass through TRPCError without wrapping", async () => {
      const originalError = new TRPCError({
        code: "NOT_FOUND",
        message: "Container not found",
      })

      const operation = async () => {
        throw originalError
      }

      await expect(withErrorHandling(operation, "test operation")).rejects.toThrow(originalError)

      try {
        await withErrorHandling(operation, "test operation")
      } catch (error) {
        expect(error).toBe(originalError)
        expect((error as TRPCError).code).toBe("NOT_FOUND")
        expect((error as TRPCError).message).toBe("Container not found")
      }
    })

    it("should handle string errors", async () => {
      const operation = async () => {
        throw "String error message"
      }

      try {
        await withErrorHandling(operation, "test operation")
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).message).toBe("Error during test operation")
      }
    })

    it("should work with async operations that return objects", async () => {
      const operation = async () => ({
        containers: ["container1", "container2"],
        count: 2,
      })

      const result = await withErrorHandling(operation, "list containers")

      expect(result).toEqual({
        containers: ["container1", "container2"],
        count: 2,
      })
    })
  })
})
