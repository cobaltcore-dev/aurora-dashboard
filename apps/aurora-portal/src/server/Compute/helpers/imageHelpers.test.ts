import { describe, it, expect, beforeEach, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { ZodError } from "zod"
import { ListImagesInput } from "../types/image"
import {
  applyImageQueryParams,
  validateGlanceService,
  validateUploadInput,
  mapErrorResponseToTRPCError,
  ImageErrorHandlers,
  handleZodParsingError,
  wrapError,
  withErrorHandling,
  formatBulkOperationError,
  validateBulkImageIds,
  chunkArray,
  processBulkOperation,
  diskFormatCompatibility,
  defaultContainerFormat,
  getCompatibleContainerFormats,
  getDefaultContainerFormat,
  isValidFormatCombination,
} from "./imageHelpers"

describe("imageHelpers", () => {
  describe("applyImageQueryParams", () => {
    let queryParams: URLSearchParams

    beforeEach(() => {
      queryParams = new URLSearchParams()
    })

    it("should apply sort parameter when provided", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        sort: "name:asc",
        sort_key: "created_at",
        sort_dir: "desc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("sort")).toBe("name:asc")
      expect(queryParams.has("sort_key")).toBe(false)
      expect(queryParams.has("sort_dir")).toBe(false)
    })

    it("should apply classic sort parameters when sort is not provided", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        sort_key: "created_at",
        sort_dir: "desc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("sort")).toBe("created_at:desc")
    })

    it("should apply pagination parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        limit: 25,
        marker: "image-123",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("limit")).toBe("25")
      expect(queryParams.get("marker")).toBe("image-123")
    })

    it("should apply basic filtering parameters (excluding name)", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        name: "ubuntu",
        status: "active",
        visibility: "public",
        owner: "tenant-123",
        member_status: "accepted",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      // `name` is intentionally excluded from URL params — OpenStack Glance only supports
      // exact name matches, not wildcard/substring filtering. Client-side filtering is used instead.
      expect(queryParams.has("name")).toBe(false)
      expect(queryParams.get("status")).toBe("active")
      expect(queryParams.get("visibility")).toBe("public")
      expect(queryParams.get("owner")).toBe("tenant-123")
      expect(queryParams.get("member_status")).toBe("accepted")
    })

    it("should not add name to URL even when name is provided", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        name: "ubuntu-22.04",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.has("name")).toBe(false)
    })

    it("should apply boolean parameters correctly", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        protected: "true",
        os_hidden: false,
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("protected")).toBe("true")
      expect(queryParams.get("os_hidden")).toBe("false")
    })

    it("should apply format parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        container_format: "bare",
        disk_format: "qcow2",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("container_format")).toBe("bare")
      expect(queryParams.get("disk_format")).toBe("qcow2")
    })

    it("should apply numeric parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        min_ram: 512,
        min_disk: 10,
        size_min: 1024,
        size_max: 2048,
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("min_ram")).toBe("512")
      expect(queryParams.get("min_disk")).toBe("10")
      expect(queryParams.get("size_min")).toBe("1024")
      expect(queryParams.get("size_max")).toBe("2048")
    })

    it("should apply tag and OS parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        tag: "production",
        os_type: "linux",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("tag")).toBe("production")
      expect(queryParams.get("os_type")).toBe("linux")
    })

    it("should apply time-based filtering parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        created_at: "gte:2023-01-01T00:00:00Z",
        updated_at: "lt:2023-12-31T23:59:59Z",
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      expect(queryParams.get("created_at")).toBe("gte:2023-01-01T00:00:00Z")
      expect(queryParams.get("updated_at")).toBe("lt:2023-12-31T23:59:59Z")
    })

    it("should not apply undefined or null parameters", () => {
      const input: Omit<ListImagesInput, "projectId"> = {
        name: undefined,
        limit: undefined,
        protected: undefined,
        sort_key: "name",
        sort_dir: "asc",
      }

      applyImageQueryParams(queryParams, input)

      // `name` is never added to URL params regardless (even if defined) — excluded by design
      expect(queryParams.has("name")).toBe(false)
      expect(queryParams.has("limit")).toBe(false)
      expect(queryParams.has("protected")).toBe(false)
      expect(queryParams.get("sort")).toBe("name:asc")
    })
  })

  describe("validateGlanceService", () => {
    it("should not throw for valid service", () => {
      const glanceService = { api: "mock" }

      expect(() => validateGlanceService(glanceService)).not.toThrow()
    })

    it("should throw TRPCError for null service", () => {
      expect(() => validateGlanceService(null)).toThrow(TRPCError)
      expect(() => validateGlanceService(null)).toThrow("Failed to initialize OpenStack Glance service")
    })

    it("should throw TRPCError for undefined service", () => {
      expect(() => validateGlanceService(undefined)).toThrow(TRPCError)
      expect(() => validateGlanceService(undefined)).toThrow("Failed to initialize OpenStack Glance service")
    })
  })

  describe("mapErrorResponseToTRPCError", () => {
    it("should map 400 status BAD_REQUEST", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 400, message: "Bad Request" }
      const context = { operation: "create image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("BAD_REQUEST")
      expect(error.message).toBe("Failed to create image image: image-123")
    })

    it("should map 403 status FORBIDDEN", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 403, message: "Forbidden" }
      const context = { operation: "delete image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("FORBIDDEN")
      expect(error.message).toBe("Access forbidden - cannot delete image image: image-123")
    })

    it("should map 404 status NOT_FOUND", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 404, message: "Not Found" }
      const context = { operation: "get image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("NOT_FOUND")
      expect(error.message).toBe("Image not found image: image-123")
    })

    it("should map 404 status with member info", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 404, message: "Not Found" }
      const context = { operation: "get member", imageId: "image-123", memberId: "member-456" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("NOT_FOUND")
      expect(error.message).toBe("Image or member not found image: image-123, member: member-456")
    })

    it("should map 409 status CONFLICT to TRPC Error", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 409, message: "Conflict" }
      const context = { operation: "update image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("CONFLICT")
      expect(error.message).toBe("Conflict - update image image: image-123")
    })

    it("should map 413 status PAYLOAD_TOO_LARGE", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 413, message: "Payload Too Large" }
      const context = { operation: "upload image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("PAYLOAD_TOO_LARGE")
      expect(error.message).toBe("Request entity too large image: image-123")
    })

    it("should map 415 status BAD_REQUEST", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 415, message: "Unsupported Media Type" }
      const context = { operation: "upload image", imageId: "image-123" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("BAD_REQUEST")
      expect(error.message).toBe("Unsupported media type image: image-123")
    })

    it("should map unknown status INTERNAL_SERVER_ERROR", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 500, message: "Internal Server Error" }
      const context = { operation: "create image" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Failed to create image: Internal Server Error")
    })

    it("should handle missing status text", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 500, message: "" }
      const context = { operation: "create image" }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Failed to create image: Unknown error")
    })

    it("should include additional info when provided", () => {
      const errorResponse = { name: "SignalOpenstackApiError", statusCode: 400, message: "Bad Request" }
      const context = {
        operation: "create image",
        imageId: "image-123",
        additionalInfo: "Invalid disk format",
      }

      const error = mapErrorResponseToTRPCError(errorResponse, context)

      expect(error.message).toBe("Failed to create image image: image-123 - Invalid disk format")
    })
  })

  describe("validateUploadInput - Streaming with FileSize", () => {
    // Helper to create a mock readable stream
    function createMockStream() {
      return {
        pipe: vi.fn().mockReturnValue({
          pipe: vi.fn().mockReturnThis(),
        }),
        on: vi.fn(),
        read: vi.fn(),
      }
    }

    describe("Valid inputs", () => {
      it("should validate correct imageId, fileSize, and fileStream", () => {
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileSize = 1024 * 1024 // 1MB
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
        expect(result.validatedFileSize).toBe(fileSize)
        expect(result.validatedFile).toBe(fileStream)
      })

      it("should trim whitespace from imageId", () => {
        const imageId = "  image-123  "
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe("image-123")
      })

      it("should handle fileSize of 0 (size not provided)", () => {
        const imageId = "image-123"
        const fileSize = 0
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(0)
      })

      it("should handle large fileSize (1GB)", () => {
        const imageId = "image-123"
        const fileSize = 1024 * 1024 * 1024 // 1GB
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(1024 * 1024 * 1024)
      })

      it("should handle very large fileSize (5GB)", () => {
        const imageId = "image-123"
        const fileSize = 5 * 1024 * 1024 * 1024 // 5GB
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(5 * 1024 * 1024 * 1024)
      })

      it("should handle UUID format imageId", () => {
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
      })

      it("should handle alphanumeric imageId", () => {
        const imageId = "image-abc123xyz789"
        const fileSize = 4096
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
      })

      it("should handle fileSize as undefined (defaults to 0)", () => {
        const imageId = "image-123"
        const fileSize = undefined
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(0)
      })

      it("should handle fileSize as null (defaults to 0)", () => {
        const imageId = "image-123"
        const fileSize = null
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(0)
      })

      it("should return object with all three properties", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(Object.keys(result).sort()).toEqual(["validatedFile", "validatedFileSize", "validatedImageId"])
      })

      it("should not modify the original fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFile).toBe(fileStream)
      })
    })

    describe("ImageId validation - missing/falsy values", () => {
      it("should throw BAD_REQUEST for null imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(null, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(null, fileSize, fileStream)).toThrow("imageId is required")
      })

      it("should throw BAD_REQUEST for undefined imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(undefined, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(undefined, fileSize, fileStream)).toThrow("imageId is required")
      })

      it("should throw BAD_REQUEST for empty string imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput("", fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput("", fileSize, fileStream)).toThrow("imageId is required")
      })

      it("should throw BAD_REQUEST for whitespace-only imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput("   ", fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput("   ", fileSize, fileStream)).toThrow("imageId cannot be empty")
      })

      it("should throw BAD_REQUEST for false imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(false, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(false, fileSize, fileStream)).toThrow("imageId is required")
      })

      it("should throw BAD_REQUEST for zero imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(0, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(0, fileSize, fileStream)).toThrow("imageId is required")
      })
    })

    describe("ImageId validation - type checking", () => {
      it("should throw BAD_REQUEST for number imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(123, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(123, fileSize, fileStream)).toThrow("imageId must be a string")
      })

      it("should throw BAD_REQUEST for object imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput({ id: "image-123" }, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput({ id: "image-123" }, fileSize, fileStream)).toThrow("imageId must be a string")
      })

      it("should throw BAD_REQUEST for array imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(["image-123"], fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(["image-123"], fileSize, fileStream)).toThrow("imageId must be a string")
      })

      it("should throw BAD_REQUEST for boolean imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        expect(() => validateUploadInput(true, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(true, fileSize, fileStream)).toThrow("imageId must be a string")
      })
    })

    describe("FileStream validation - missing/falsy values", () => {
      it("should throw BAD_REQUEST for null fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, null)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, null)).toThrow("File not uploaded")
      })

      it("should throw BAD_REQUEST for undefined fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, undefined)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, undefined)).toThrow("File not uploaded")
      })

      it("should throw BAD_REQUEST for false fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, false)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, false)).toThrow("File not uploaded")
      })

      it("should throw BAD_REQUEST for zero fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, 0)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, 0)).toThrow("File not uploaded")
      })
    })

    describe("FileStream validation - type checking", () => {
      it("should throw INTERNAL_SERVER_ERROR for string fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, "not a stream")).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, "not a stream")).toThrow("Invalid file stream format")
      })

      it("should throw INTERNAL_SERVER_ERROR for number fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, 12345)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, 12345)).toThrow("Invalid file stream format")
      })

      it("should throw INTERNAL_SERVER_ERROR for object without pipe method", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const notAStream = { data: "file" }

        expect(() => validateUploadInput(imageId, fileSize, notAStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, notAStream)).toThrow("Invalid file stream format")
      })

      it("should throw INTERNAL_SERVER_ERROR for array fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048

        expect(() => validateUploadInput(imageId, fileSize, [1, 2, 3])).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, [1, 2, 3])).toThrow("Invalid file stream format")
      })

      it("should accept object with pipe method (stream-like)", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const streamLike = { pipe: () => {} }

        const result = validateUploadInput(imageId, fileSize, streamLike)

        expect(result.validatedFile).toBe(streamLike)
      })
    })

    describe("FileSize validation", () => {
      it("should throw BAD_REQUEST for negative fileSize", () => {
        const imageId = "image-123"
        const fileSize = -1024
        const fileStream = createMockStream()

        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow("fileSize cannot be negative")
      })

      it("should throw INTERNAL_SERVER_ERROR for non-number fileSize", () => {
        const imageId = "image-123"
        const fileSize = "1024"
        const fileStream = createMockStream()

        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(
          "Invalid fileSize format - must be a number"
        )
      })

      it("should throw INTERNAL_SERVER_ERROR for Infinity fileSize", () => {
        const imageId = "image-123"
        const fileSize = Infinity
        const fileStream = createMockStream()

        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow("fileSize must be a finite number")
      })

      it("should throw INTERNAL_SERVER_ERROR for NaN fileSize", () => {
        const imageId = "image-123"
        const fileSize = NaN
        const fileStream = createMockStream()

        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow("fileSize must be a finite number")
      })

      it("should throw INTERNAL_SERVER_ERROR for object fileSize", () => {
        const imageId = "image-123"
        const fileSize = { size: 1024 }
        const fileStream = createMockStream()

        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(TRPCError)
        expect(() => validateUploadInput(imageId, fileSize, fileStream)).toThrow(
          "Invalid fileSize format - must be a number"
        )
      })

      it("should allow fileSize of 1 byte", () => {
        const imageId = "image-123"
        const fileSize = 1
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(1)
      })
    })

    describe("Error codes validation", () => {
      it("should throw TRPCError with BAD_REQUEST code for missing imageId", () => {
        const fileSize = 2048
        const fileStream = createMockStream()
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(null, fileSize, fileStream)
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("BAD_REQUEST")
      })

      it("should throw TRPCError with BAD_REQUEST code for invalid imageId type", () => {
        const fileSize = 2048
        const fileStream = createMockStream()
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(123, fileSize, fileStream)
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("BAD_REQUEST")
      })

      it("should throw TRPCError with BAD_REQUEST code for missing fileStream", () => {
        const imageId = "image-123"
        const fileSize = 2048
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(imageId, fileSize, null)
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("BAD_REQUEST")
      })

      it("should throw TRPCError with INTERNAL_SERVER_ERROR code for invalid fileStream type", () => {
        const imageId = "image-123"
        const fileSize = 2048
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(imageId, fileSize, "not a stream")
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("INTERNAL_SERVER_ERROR")
      })

      it("should throw TRPCError with BAD_REQUEST code for negative fileSize", () => {
        const imageId = "image-123"
        const fileSize = -1024
        const fileStream = createMockStream()
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(imageId, fileSize, fileStream)
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("BAD_REQUEST")
      })

      it("should throw TRPCError with INTERNAL_SERVER_ERROR code for invalid fileSize type", () => {
        const imageId = "image-123"
        const fileSize = "not a number"
        const fileStream = createMockStream()
        let thrownError: TRPCError | undefined

        try {
          validateUploadInput(imageId, fileSize, fileStream)
        } catch (error) {
          thrownError = error as TRPCError
        }

        expect(thrownError).toBeInstanceOf(TRPCError)
        expect(thrownError?.code).toBe("INTERNAL_SERVER_ERROR")
      })
    })

    describe("Order of validation", () => {
      it("should validate imageId before fileSize", () => {
        const fileSize = 2048
        const fileStream = createMockStream()

        // Invalid imageId - should fail first
        expect(() => validateUploadInput(null, fileSize, fileStream)).toThrow("imageId is required")
        expect(() => validateUploadInput(123, fileSize, fileStream)).toThrow("imageId must be a string")
        expect(() => validateUploadInput("   ", fileSize, fileStream)).toThrow("imageId cannot be empty")
      })

      it("should validate fileStream before fileSize", () => {
        const imageId = "image-123"
        const fileSize = -1024 // Invalid

        // Invalid fileStream - should fail before fileSize validation
        expect(() => validateUploadInput(imageId, fileSize, null)).toThrow("File not uploaded")
        expect(() => validateUploadInput(imageId, fileSize, "not a stream")).toThrow("Invalid file stream format")
      })

      it("should validate fileSize after imageId and fileStream are valid", () => {
        const imageId = "image-123"
        const fileStream = createMockStream()

        // Valid imageId and fileStream, but invalid fileSize
        expect(() => validateUploadInput(imageId, -1024, fileStream)).toThrow("fileSize cannot be negative")
        expect(() => validateUploadInput(imageId, "string", fileStream)).toThrow(
          "Invalid fileSize format - must be a number"
        )
        expect(() => validateUploadInput(imageId, Infinity, fileStream)).toThrow("fileSize must be a finite number")
      })
    })

    describe("Return value validation", () => {
      it("should return object with correct property names", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result).toHaveProperty("validatedImageId")
        expect(result).toHaveProperty("validatedFile")
        expect(result).toHaveProperty("validatedFileSize")
      })

      it("should trim imageId but return new trimmed string", () => {
        const imageId = "  image-123  "
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe("image-123")
        expect(result.validatedImageId).not.toBe(imageId)
      })

      it("should return the same fileStream object reference", () => {
        const imageId = "image-123"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFile).toBe(fileStream)
      })

      it("should return exact fileSize value", () => {
        const imageId = "image-123"
        const fileSize = 1234567
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(1234567)
      })

      it("should convert undefined fileSize to 0", () => {
        const imageId = "image-123"
        const fileSize = undefined
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(0)
      })

      it("should convert null fileSize to 0", () => {
        const imageId = "image-123"
        const fileSize = null
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedFileSize).toBe(0)
      })
    })

    describe("Edge cases", () => {
      it("should handle imageId with special characters", () => {
        const imageId = "image-123!@#$%"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
      })

      it("should handle imageId with unicode characters", () => {
        const imageId = "image-🎉-emoji"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
      })

      it("should handle very long imageId", () => {
        const imageId = "a".repeat(1000)
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe(imageId)
        expect(result.validatedImageId.length).toBe(1000)
      })

      it("should handle imageId with leading/trailing tabs and newlines", () => {
        const imageId = "\t\n  image-123  \n\t"
        const fileSize = 2048
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result.validatedImageId).toBe("image-123")
      })

      it("should handle fileSize boundary values", () => {
        const imageId = "image-123"
        const fileStream = createMockStream()

        // Minimum valid
        let result = validateUploadInput(imageId, 0, fileStream)
        expect(result.validatedFileSize).toBe(0)

        // Large but valid
        result = validateUploadInput(imageId, Number.MAX_SAFE_INTEGER, fileStream)
        expect(result.validatedFileSize).toBe(Number.MAX_SAFE_INTEGER)
      })

      it("should work with minimal valid inputs", () => {
        const imageId = "id"
        const fileSize = 0
        const fileStream = createMockStream()

        const result = validateUploadInput(imageId, fileSize, fileStream)

        expect(result).toBeDefined()
        expect(result.validatedImageId).toBe("id")
        expect(result.validatedFileSize).toBe(0)
        expect(result.validatedFile).toBe(fileStream)
      })
    })
  })

  describe("ImageErrorHandlers", () => {
    describe("upload", () => {
      it("should handle 404 error for upload", () => {
        const response = { statusCode: 404 }
        const imageId = "image-123"

        const error = ImageErrorHandlers.upload(response, imageId)

        expect(error.code).toBe("NOT_FOUND")
        expect(error.message).toBe("Image not found: image-123")
      })

      it("should handle 403 error for upload", () => {
        const response = { statusCode: 403 }
        const imageId = "image-123"

        const error = ImageErrorHandlers.upload(response, imageId)

        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe("Access forbidden - cannot upload to image: image-123")
      })

      it("should handle 409 error for upload", () => {
        const response = { statusCode: 409 }
        const imageId = "image-123"

        const error = ImageErrorHandlers.upload(response, imageId)

        expect(error.code).toBe("CONFLICT")
        expect(error.message).toBe("Image is not in a valid state for upload: image-123")
      })

      it("should handle 415 error with content type", () => {
        const response = { statusCode: 415 }
        const imageId = "image-123"
        const contentType = "application/pdf"

        const error = ImageErrorHandlers.upload(response, imageId, contentType)

        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("Unsupported content type for image upload: application/pdf")
      })
    })

    describe("member.create", () => {
      it("should handle 409 conflict for member creation", () => {
        const response = { status: 409 }
        const imageId = "image-123"
        const member = "member-456"

        const error = ImageErrorHandlers.member.create(response, imageId, member)

        expect(error.code).toBe("CONFLICT")
        expect(error.message).toBe("Member already exists for image: image-123, member-456")
      })

      it("should handle 400 error for member creation", () => {
        const response = { status: 400 }
        const imageId = "image-123"
        const member = "member-456"

        const error = ImageErrorHandlers.member.create(response, imageId, member)

        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe(
          "Invalid request - check image visibility is 'shared' and member ID is valid: image-123"
        )
      })
    })

    describe("member.update", () => {
      it("should handle 403 error for member update", () => {
        const response = { status: 403 }
        const imageId = "image-123"
        const memberId = "member-456"
        const status = "accepted"

        const error = ImageErrorHandlers.member.update(response, imageId, memberId, status)

        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe(
          "Access forbidden - only the member can update their own status: image-123, member-456"
        )
      })

      it("should handle 400 error for invalid status", () => {
        const response = { status: 400 }
        const imageId = "image-123"
        const memberId = "member-456"
        const status = "invalid-status"

        const error = ImageErrorHandlers.member.update(response, imageId, memberId, status)

        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("Invalid status value: invalid-status")
      })
    })

    describe("visibility", () => {
      it("should handle 409 conflict for visibility update", () => {
        const response = { status: 409 }
        const imageId = "image-123"
        const visibility = "public"

        const error = ImageErrorHandlers.visibility(response, imageId, visibility)

        expect(error.code).toBe("CONFLICT")
        expect(error.message).toBe("Image is not in a valid state for visibility update: image-123")
      })

      it("should handle 400 error for invalid visibility", () => {
        const response = { status: 400 }
        const imageId = "image-123"
        const visibility = "invalid-visibility"

        const error = ImageErrorHandlers.visibility(response, imageId, visibility)

        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("Invalid visibility value for image: invalid-visibility")
      })
    })

    describe("delete", () => {
      it("should handle 403 error for protected image deletion", () => {
        const response = { status: 403 }
        const imageId = "image-123"

        const error = ImageErrorHandlers.delete(response, imageId)

        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe("Cannot delete protected image: image-123")
      })
    })
  })

  describe("handleZodParsingError", () => {
    it("should convert ZodError to TRPCError", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Expected string, received number",
        },
      ])
      const operation = "parse image response"

      const error = handleZodParsingError(zodError, operation)

      expect(error.code).toBe("INTERNAL_SERVER_ERROR")
      expect(error.message).toBe("Invalid response format from OpenStack Glance API during parse image response")
      expect(error.cause).toBe(zodError)
    })
  })

  describe("wrapError", () => {
    it("should return TRPCError as-is", () => {
      const originalError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Original error",
      })

      const result = wrapError(originalError, "test operation")

      expect(result).toBe(originalError)
    })

    it("should wrap non-TRPCError in TRPCError", () => {
      const originalError = new Error("Regular error")

      const result = wrapError(originalError, "test operation")

      expect(result).toBeInstanceOf(TRPCError)
      expect(result.code).toBe("INTERNAL_SERVER_ERROR")
      expect(result.message).toBe("Error during test operation: Regular error")
      expect(result.cause).toBe(originalError)
    })

    it("should wrap string error", () => {
      const originalError = "String error"

      const result = wrapError(originalError, "test operation")

      expect(result).toBeInstanceOf(TRPCError)
      expect(result.code).toBe("INTERNAL_SERVER_ERROR")
      expect(result.message).toBe("Error during test operation")

      // When a string is passed to the TRPCError constructor as the cause, it gets automatically converted to an Error object.
      // This is likely happening within the tRPC library itself.
      expect(result.cause).toEqual(new Error(originalError))
    })
  })

  describe("withErrorHandling", () => {
    it("should return successful operation result", async () => {
      const operation = async () => "success"

      const result = await withErrorHandling(operation, "test operation")

      expect(result).toBe("success")
    })

    it("should wrap thrown errors in TRPCError", async () => {
      const operation = async () => {
        throw new Error("Operation failed")
      }

      await expect(withErrorHandling(operation, "test operation")).rejects.toThrow(TRPCError)
      await expect(withErrorHandling(operation, "test operation")).rejects.toThrow(
        "Error during test operation: Operation failed"
      )
    })

    it("should preserve TRPCError instances", async () => {
      const originalError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Original TRPC error",
      })
      const operation = async () => {
        throw originalError
      }

      await expect(withErrorHandling(operation, "test operation")).rejects.toBe(originalError)
    })

    it("should handle async operations that return promises", async () => {
      const operation = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("async result"), 10)
        })
      }

      const result = await withErrorHandling(operation, "test operation")

      expect(result).toBe("async result")
    })
  })

  describe("Bulk Operation Helpers", () => {
    describe("formatBulkOperationError", () => {
      it("should format TRPCError correctly", () => {
        const error = new TRPCError({ code: "NOT_FOUND", message: "Image not found" })
        const result = formatBulkOperationError("image-123", error, "delete")

        expect(result).toBe("Image not found")
      })

      it("should format Error correctly", () => {
        const error = new Error("Network timeout")
        const result = formatBulkOperationError("image-123", error, "delete")

        expect(result).toBe("Failed to delete image: Network timeout")
      })

      it("should format string error correctly", () => {
        const result = formatBulkOperationError("image-123", "Permission denied", "activate")

        expect(result).toBe("Failed to activate image: Permission denied")
      })

      it("should handle unknown error types", () => {
        const result = formatBulkOperationError("image-123", { unknown: "error" }, "deactivate")

        expect(result).toBe("Failed to deactivate image: Unknown error")
      })
    })

    describe("validateBulkImageIds", () => {
      it("should not throw for non-empty array", () => {
        expect(() => validateBulkImageIds(["image-1"], "delete")).not.toThrow()
        expect(() => validateBulkImageIds(["image-1", "image-2"], "activate")).not.toThrow()
      })

      it("should throw TRPCError for empty array", () => {
        expect(() => validateBulkImageIds([], "delete")).toThrow(TRPCError)
        expect(() => validateBulkImageIds([], "delete")).toThrow("Cannot delete - at least one image ID is required")
      })

      it("should include operation in error message", () => {
        expect(() => validateBulkImageIds([], "activate")).toThrow(
          "Cannot activate - at least one image ID is required"
        )
      })
    })

    describe("chunkArray", () => {
      it("should chunk array into specified sizes", () => {
        const array = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        const chunks = chunkArray(array, 3)

        expect(chunks).toEqual([
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ])
      })

      it("should handle array not evenly divisible by chunk size", () => {
        const array = [1, 2, 3, 4, 5]
        const chunks = chunkArray(array, 2)

        expect(chunks).toEqual([[1, 2], [3, 4], [5]])
      })

      it("should handle chunk size larger than array", () => {
        const array = [1, 2, 3]
        const chunks = chunkArray(array, 10)

        expect(chunks).toEqual([[1, 2, 3]])
      })

      it("should handle empty array", () => {
        const array: number[] = []
        const chunks = chunkArray(array, 5)

        expect(chunks).toEqual([])
      })

      it("should handle chunk size of 1", () => {
        const array = [1, 2, 3]
        const chunks = chunkArray(array, 1)

        expect(chunks).toEqual([[1], [2], [3]])
      })
    })

    describe("processBulkOperation", () => {
      it("should process all items successfully", async () => {
        const items = [{ id: "item-1" }, { id: "item-2" }, { id: "item-3" }]
        const processor = vi.fn().mockResolvedValue(undefined)

        const result = await processBulkOperation(items, processor)

        expect(processor).toHaveBeenCalledTimes(3)
        expect(result.successful).toEqual(["item-1", "item-2", "item-3"])
        expect(result.failed).toEqual([])
      })

      it("should handle partial failures", async () => {
        const items = [{ id: "item-1" }, { id: "item-2" }, { id: "item-3" }]
        const processor = vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce(undefined)

        const result = await processBulkOperation(items, processor)

        expect(result.successful).toEqual(["item-1", "item-3"])
        expect(result.failed).toHaveLength(1)
        expect(result.failed[0].imageId).toBe("item-2")
        expect(result.failed[0].error).toBe("Failed to process image: Failed")
      })

      it("should process in chunks when chunkSize is specified", async () => {
        const items = [{ id: "item-1" }, { id: "item-2" }, { id: "item-3" }, { id: "item-4" }]
        const processor = vi.fn().mockResolvedValue(undefined)

        const result = await processBulkOperation(items, processor, { chunkSize: 2 })

        expect(processor).toHaveBeenCalledTimes(4)
        expect(result.successful).toEqual(["item-1", "item-2", "item-3", "item-4"])
        expect(result.failed).toEqual([])
      })

      it("should add delay between chunks when specified", async () => {
        const items = [{ id: "item-1" }, { id: "item-2" }, { id: "item-3" }]
        const processor = vi.fn().mockResolvedValue(undefined)

        const startTime = Date.now()
        await processBulkOperation(items, processor, { chunkSize: 1, delayBetweenChunks: 10 })
        const duration = Date.now() - startTime

        expect(processor).toHaveBeenCalledTimes(3)
        // Should take at least 20ms (2 delays of 10ms each between 3 chunks)
        expect(duration).toBeGreaterThanOrEqual(15)
      })

      it("should handle all failures in chunked processing", async () => {
        const items = [{ id: "item-1" }, { id: "item-2" }]
        const processor = vi.fn().mockRejectedValue(new Error("Always fails"))

        const result = await processBulkOperation(items, processor, { chunkSize: 1 })

        expect(result.successful).toEqual([])
        expect(result.failed).toHaveLength(2)
      })

      it("should handle empty items array", async () => {
        const items: Array<{ id: string }> = []
        const processor = vi.fn()

        const result = await processBulkOperation(items, processor)

        expect(processor).not.toHaveBeenCalled()
        expect(result.successful).toEqual([])
        expect(result.failed).toEqual([])
      })

      it("should handle processor throwing non-Error objects", async () => {
        const items = [{ id: "item-1" }]
        const processor = vi.fn().mockRejectedValue("String error")

        const result = await processBulkOperation(items, processor)

        expect(result.failed).toHaveLength(1)
        expect(result.failed[0].error).toBe("Failed to process image: String error")
      })

      it("should use custom operation name in error messages", async () => {
        const items = [{ id: "item-1" }]
        const processor = vi.fn().mockRejectedValue(new Error("Network timeout"))

        const result = await processBulkOperation(items, processor, { operation: "delete" })

        expect(result.failed).toHaveLength(1)
        expect(result.failed[0].error).toBe("Failed to delete image: Network timeout")
      })

      it("should default to 'process' operation when not specified", async () => {
        const items = [{ id: "item-1" }]
        const processor = vi.fn().mockRejectedValue(new Error("Test error"))

        const result = await processBulkOperation(items, processor)

        expect(result.failed).toHaveLength(1)
        expect(result.failed[0].error).toBe("Failed to process image: Test error")
      })
    })
  })

  describe("Format Mapping Helpers", () => {
    describe("diskFormatCompatibility", () => {
      it("should have compatibility data for all disk formats", () => {
        expect(diskFormatCompatibility).toBeDefined()
        expect(Object.keys(diskFormatCompatibility).length).toBeGreaterThan(0)
      })

      it("should have qcow2 compatible with bare, ova, docker", () => {
        expect(diskFormatCompatibility.qcow2).toEqual(["bare", "ova", "docker"])
      })

      it("should have iso only compatible with bare", () => {
        expect(diskFormatCompatibility.iso).toEqual(["bare"])
      })

      it("should have ami only compatible with ami container", () => {
        expect(diskFormatCompatibility.ami).toEqual(["ami"])
      })

      it("should have aki only compatible with aki container", () => {
        expect(diskFormatCompatibility.aki).toEqual(["aki"])
      })

      it("should have ari only compatible with ari container", () => {
        expect(diskFormatCompatibility.ari).toEqual(["ari"])
      })

      it("should have vmdk compatible with bare and ova", () => {
        expect(diskFormatCompatibility.vmdk).toEqual(["bare", "ova"])
      })

      it("should have raw compatible with bare, ova, docker", () => {
        expect(diskFormatCompatibility.raw).toEqual(["bare", "ova", "docker"])
      })
    })

    describe("defaultContainerFormat", () => {
      it("should have default format for all disk formats", () => {
        expect(defaultContainerFormat).toBeDefined()
        expect(Object.keys(defaultContainerFormat).length).toBeGreaterThan(0)
      })

      it("should have bare as default for qcow2", () => {
        expect(defaultContainerFormat.qcow2).toBe("bare")
      })

      it("should have bare as default for raw", () => {
        expect(defaultContainerFormat.raw).toBe("bare")
      })

      it("should have bare as default for vmdk", () => {
        expect(defaultContainerFormat.vmdk).toBe("bare")
      })

      it("should have bare as default for iso", () => {
        expect(defaultContainerFormat.iso).toBe("bare")
      })

      it("should have ami as default for ami disk format", () => {
        expect(defaultContainerFormat.ami).toBe("ami")
      })

      it("should have aki as default for aki disk format", () => {
        expect(defaultContainerFormat.aki).toBe("aki")
      })

      it("should have ari as default for ari disk format", () => {
        expect(defaultContainerFormat.ari).toBe("ari")
      })
    })

    describe("getCompatibleContainerFormats", () => {
      it("should return compatible formats for qcow2", () => {
        const formats = getCompatibleContainerFormats("qcow2")
        expect(formats).toEqual(["bare", "ova", "docker"])
      })

      it("should return compatible formats for vmdk", () => {
        const formats = getCompatibleContainerFormats("vmdk")
        expect(formats).toEqual(["bare", "ova"])
      })

      it("should return compatible formats for iso", () => {
        const formats = getCompatibleContainerFormats("iso")
        expect(formats).toEqual(["bare"])
      })

      it("should return empty array for unknown disk format", () => {
        const formats = getCompatibleContainerFormats("unknown-format")
        expect(formats).toEqual([])
      })

      it("should return ami for ami disk format", () => {
        const formats = getCompatibleContainerFormats("ami")
        expect(formats).toEqual(["ami"])
      })

      it("should return only one option for special Amazon formats", () => {
        expect(getCompatibleContainerFormats("aki")).toEqual(["aki"])
        expect(getCompatibleContainerFormats("ari")).toEqual(["ari"])
      })

      it("should handle case sensitivity", () => {
        const formats = getCompatibleContainerFormats("QCOW2")
        expect(formats).toEqual([])
      })
    })

    describe("getDefaultContainerFormat", () => {
      it("should return bare for qcow2", () => {
        expect(getDefaultContainerFormat("qcow2")).toBe("bare")
      })

      it("should return bare for raw", () => {
        expect(getDefaultContainerFormat("raw")).toBe("bare")
      })

      it("should return bare for vmdk", () => {
        expect(getDefaultContainerFormat("vmdk")).toBe("bare")
      })

      it("should return ami for ami disk format", () => {
        expect(getDefaultContainerFormat("ami")).toBe("ami")
      })

      it("should return aki for aki disk format", () => {
        expect(getDefaultContainerFormat("aki")).toBe("aki")
      })

      it("should return ari for ari disk format", () => {
        expect(getDefaultContainerFormat("ari")).toBe("ari")
      })

      it("should return empty string for unknown disk format", () => {
        expect(getDefaultContainerFormat("unknown-format")).toBe("")
      })

      it("should return bare as most common default", () => {
        const formats = ["qcow2", "raw", "vmdk", "vhd", "vhdx", "vdi", "iso", "ploop"]
        formats.forEach((format) => {
          expect(getDefaultContainerFormat(format)).toBe("bare")
        })
      })
    })

    describe("isValidFormatCombination", () => {
      it("should validate qcow2 with bare", () => {
        expect(isValidFormatCombination("qcow2", "bare")).toBe(true)
      })

      it("should validate qcow2 with ova", () => {
        expect(isValidFormatCombination("qcow2", "ova")).toBe(true)
      })

      it("should validate qcow2 with docker", () => {
        expect(isValidFormatCombination("qcow2", "docker")).toBe(true)
      })

      it("should reject qcow2 with ami", () => {
        expect(isValidFormatCombination("qcow2", "ami")).toBe(false)
      })

      it("should validate iso with bare", () => {
        expect(isValidFormatCombination("iso", "bare")).toBe(true)
      })

      it("should reject iso with ova", () => {
        expect(isValidFormatCombination("iso", "ova")).toBe(false)
      })

      it("should reject iso with docker", () => {
        expect(isValidFormatCombination("iso", "docker")).toBe(false)
      })

      it("should validate ami with ami", () => {
        expect(isValidFormatCombination("ami", "ami")).toBe(true)
      })

      it("should reject ami with bare", () => {
        expect(isValidFormatCombination("ami", "bare")).toBe(false)
      })

      it("should validate vmdk with bare and ova", () => {
        expect(isValidFormatCombination("vmdk", "bare")).toBe(true)
        expect(isValidFormatCombination("vmdk", "ova")).toBe(true)
      })

      it("should reject vmdk with docker", () => {
        expect(isValidFormatCombination("vmdk", "docker")).toBe(false)
      })

      it("should handle unknown disk format", () => {
        expect(isValidFormatCombination("unknown", "bare")).toBe(false)
      })

      it("should validate all Amazon special formats", () => {
        expect(isValidFormatCombination("ami", "ami")).toBe(true)
        expect(isValidFormatCombination("aki", "aki")).toBe(true)
        expect(isValidFormatCombination("ari", "ari")).toBe(true)
      })

      it("should reject cross-amazon format combinations", () => {
        expect(isValidFormatCombination("ami", "aki")).toBe(false)
        expect(isValidFormatCombination("aki", "ari")).toBe(false)
        expect(isValidFormatCombination("ari", "ami")).toBe(false)
      })

      it("should work with all hypervisor formats", () => {
        // Hyper-V family
        expect(isValidFormatCombination("vhd", "bare")).toBe(true)
        expect(isValidFormatCombination("vhdx", "bare")).toBe(true)
        // VirtualBox
        expect(isValidFormatCombination("vdi", "bare")).toBe(true)
        // Parallels
        expect(isValidFormatCombination("ploop", "bare")).toBe(true)
      })
    })
  })
})
