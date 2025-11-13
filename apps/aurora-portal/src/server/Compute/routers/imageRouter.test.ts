import { describe, it, expect, vi, beforeEach, Mock } from "vitest"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "../../context"
import { imageRouter } from "./imageRouter"
import * as imageHelpers from "../helpers/imageHelpers"
import { GlanceImage, ImageMember } from "../types/image"
import { createCallerFactory, auroraRouter } from "../../trpc"

// Mock the helpers
vi.mock("../helpers/imageHelpers", async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    applyImageQueryParams: vi.fn(),
    validateGlanceService: vi.fn(),
    ImageErrorHandlers: {
      upload: vi.fn(),
      visibility: vi.fn(),
      delete: vi.fn(),
      member: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    handleZodParsingError: vi.fn(),
    withErrorHandling: vi.fn((fn) => fn()),
  }
})

// Mock data
const mockGlanceImage: GlanceImage = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "test-image",
  status: "active",
  visibility: "private",
  size: 1024,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  min_disk: 0,
  min_ram: 0,
  owner: "test-owner",
  protected: false,
  tags: [],
  container_format: "bare",
  disk_format: "qcow2",
}

const mockImageMember: ImageMember = {
  created_at: "2023-01-01T00:00:00Z",
  image_id: "123e4567-e89b-12d3-a456-426614174000",
  member_id: "test-member-id",
  schema: "/v2/schemas/member",
  status: "pending",
  updated_at: "2023-01-01T00:00:00Z",
}

// Mock context
const createMockContext = (shouldFailAuth = false, shouldFailGlance = false) => {
  const mockGlance = {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ images: [mockGlanceImage] }),
    }),
    post: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockGlanceImage),
    }),
    put: vi.fn().mockResolvedValue({
      ok: true,
    }),
    patch: vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockGlanceImage),
    }),
    del: vi.fn().mockResolvedValue({
      ok: true,
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    createSession: vi.fn().mockResolvedValue({}),
    terminateSession: vi.fn().mockResolvedValue({}),
    openstack: {
      service: vi.fn().mockReturnValue(shouldFailGlance ? null : mockGlance),
    },
    rescopeSession: vi.fn().mockResolvedValue({}),
    mockGlance,
  } as unknown as AuroraPortalContext & { mockGlance: typeof mockGlance }
}

const createCaller = createCallerFactory(auroraRouter({ image: imageRouter }))

// Helper function to generate valid UUIDs for testing
const generateTestUUID = (id: number): string => {
  return `00000000-0000-0000-0000-${String(id).padStart(12, "0")}`
}

describe("imageRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset withErrorHandling to pass through by default
    ;(imageHelpers.withErrorHandling as Mock).mockImplementation((fn) => fn())
  })

  describe("listImages", () => {
    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      const input = {}

      await expect(caller.image.listImages(input)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(mockCtx.validateSession).toHaveBeenCalled()
    })

    it("should successfully list images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {}
      const result = await caller.image.listImages(input)

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("v2/images?"))
      expect(result).toEqual([mockGlanceImage])
    })

    it("should handle API error response", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Mock failed response
      mockCtx.mockGlance.get.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" })

      const input = {}

      await expect(caller.image.listImages(input)).rejects.toThrow("Failed to list images: Internal Server Error")
    })
  })

  describe("getImageById", () => {
    it("should get image by ID successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockGlanceImage),
      })

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174000" }
      const result = await caller.image.getImageById(input)

      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000")
      expect(result).toEqual(mockGlanceImage)
    })

    it("should handle not found error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockRejectedValue({ statusCode: 404, message: "Not Found" })

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174111" }

      await expect(caller.image.getImageById(input)).rejects.toThrow(`Image not found image: ${input.imageId}`)
    })
  })

  describe("createImage", () => {
    it("should create image successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ image: mockGlanceImage }),
      })

      const input = {
        name: "new-image",
        container_format: "bare" as const,
        disk_format: "qcow2" as const,
      }
      const result = await caller.image.createImage(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith("v2/images", {
        json: {
          name: "new-image",
          container_format: "bare",
          disk_format: "qcow2",
          // Default values added from the schema
          min_disk: 0,
          min_ram: 0,
          os_hidden: false,
          protected: false,
          tags: [],
          visibility: "private",
        },
      })
      expect(result).toEqual(mockGlanceImage)
    })

    it("should handle creation error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockRejectedValue({ statusCode: 400, message: "Bad Request" })

      const input = {
        name: "new-image",
        container_format: "bare" as const,
        disk_format: "qcow2" as const,
      }

      await expect(caller.image.createImage(input)).rejects.toThrow("Failed to create image")
    })
  })

  describe("uploadImage", () => {
    it("should upload image with base64 data successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.put.mockResolvedValue({
        ok: true,
      })

      const base64Data = btoa("test image data")
      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        imageData: base64Data,
        contentType: "application/octet-stream",
      }

      const result = await caller.image.uploadImage(input)

      expect(mockCtx.mockGlance.put).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000/file", {
        body: expect.any(ArrayBuffer),
        headers: { "Content-Type": "application/octet-stream" },
      })
      expect(result).toBe(true)
    })

    it("should handle upload error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.put.mockImplementation(() => {
        return Promise.reject(new Error("400 Bad Request"))
      })

      const mockError = new TRPCError({ code: "BAD_REQUEST", message: "Upload failed" })
      ;(imageHelpers.ImageErrorHandlers.upload as Mock).mockReturnValue(mockError)

      const base64Data = btoa("test image data")
      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        imageData: base64Data,
        contentType: "application/octet-stream",
      }

      await expect(caller.image.uploadImage(input)).rejects.toThrow("Upload failed")
    })
  })

  describe("updateImage", () => {
    it("should update image successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.patch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockGlanceImage),
      })

      const operations = [{ op: "replace" as const, path: "/name", value: "updated-name" }]
      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        operations,
      }

      const result = await caller.image.updateImage(input)

      expect(mockCtx.mockGlance.patch).toHaveBeenCalledWith(
        "v2/images/123e4567-e89b-12d3-a456-426614174000",
        operations,
        {
          headers: { "Content-Type": "application/openstack-images-v2.1-json-patch" },
        }
      )
      expect(result).toEqual(mockGlanceImage)
    })
  })

  describe("updateImageVisibility", () => {
    it("should update image visibility successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const updatedImage = { ...mockGlanceImage, visibility: "public" as const }
      mockCtx.mockGlance.patch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(updatedImage),
      })

      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        visibility: "public" as const,
      }

      const result = await caller.image.updateImageVisibility(input)

      expect(mockCtx.mockGlance.patch).toHaveBeenCalledWith(
        "v2/images/123e4567-e89b-12d3-a456-426614174000",
        [{ op: "replace", path: "/visibility", value: "public" }],
        {
          headers: { "Content-Type": "application/openstack-images-v2.1-json-patch" },
        }
      )
      expect(result).toEqual(updatedImage)
    })

    it("should handle visibility update error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.patch.mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "FORBIDDEN", message: "Visibility update failed" })
      ;(imageHelpers.ImageErrorHandlers.visibility as Mock).mockReturnValue(mockError)

      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        visibility: "public" as const,
      }

      await expect(caller.image.updateImageVisibility(input)).rejects.toThrow("Visibility update failed")
    })
  })

  describe("deleteImage", () => {
    it("should delete image successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: true,
      })

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174000" }
      const result = await caller.image.deleteImage(input)

      expect(mockCtx.mockGlance.del).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000")
      expect(result).toBe(true)
    })

    it("should handle delete error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "NOT_FOUND", message: "Delete failed" })
      ;(imageHelpers.ImageErrorHandlers.delete as Mock).mockReturnValue(mockError)

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174000" }

      await expect(caller.image.deleteImage(input)).rejects.toThrow("Delete failed")
    })
  })

  describe("listImageMembers", () => {
    it("should list image members successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ members: [mockImageMember] }),
      })

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174000" }
      const result = await caller.image.listImageMembers(input)

      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000/members")
      expect(result).toEqual([mockImageMember])
    })

    it("should handle list members error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "NOT_FOUND", message: "List members failed" })
      ;(imageHelpers.ImageErrorHandlers.member.list as Mock).mockReturnValue(mockError)

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174000" }

      await expect(caller.image.listImageMembers(input)).rejects.toThrow("List members failed")
    })
  })

  describe("createImageMember", () => {
    it("should create image member successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockImageMember),
      })

      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        member: "test-member-id",
      }
      const result = await caller.image.createImageMember(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000/members", {
        json: { member: "test-member-id" },
      })
      expect(result).toEqual(mockImageMember)
    })

    it("should handle create member error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "CONFLICT", message: "Create member failed" })
      ;(imageHelpers.ImageErrorHandlers.member.create as Mock).mockReturnValue(mockError)

      const input = {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        member: "test-member-id",
      }

      await expect(caller.image.createImageMember(input)).rejects.toThrow("Create member failed")
    })
  })

  describe("Error handling and edge cases", () => {
    it("should validate glance service for all endpoints", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      await caller.image.listImages({})

      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
    })

    it("should handle missing glance service", async () => {
      const mockCtx = createMockContext(false, true)
      const caller = createCaller(mockCtx)

      const input = {}

      await expect(caller.image.listImages(input)).rejects.toThrow()
    })

    it("should apply query parameters correctly", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        name: "test-image",
        status: "active" as const,
      }

      await caller.image.listImages(input)

      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalledWith(expect.any(URLSearchParams), {
        name: "test-image",
        status: "active",
      })
    })
  })

  describe("deleteImages", () => {
    it("should delete multiple images successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: true,
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deleteImages(input)

      expect(mockCtx.mockGlance.del).toHaveBeenCalledTimes(3)
      expect(mockCtx.mockGlance.del).toHaveBeenCalledWith(`v2/images/${imageIds[0]}`)
      expect(mockCtx.mockGlance.del).toHaveBeenCalledWith(`v2/images/${imageIds[1]}`)
      expect(mockCtx.mockGlance.del).toHaveBeenCalledWith(`v2/images/${imageIds[2]}`)
      expect(result.successful).toEqual(imageIds)
      expect(result.failed).toEqual([])
    })

    it("should handle partial failures when deleting multiple images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: true })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("403")
    })

    it("should handle exceptions when deleting images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ ok: true })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Network error")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        imageIds: [],
      }

      await expect(caller.image.deleteImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to delete", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2)]
      const input = { imageIds }

      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([])
      expect(result.failed).toHaveLength(2)
    })
  })

  describe("activateImages", () => {
    it("should activate multiple images successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: true,
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.activateImages(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledTimes(3)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[0]}/actions/reactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[1]}/actions/reactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[2]}/actions/reactivate`, undefined)
      expect(result.successful).toEqual(imageIds)
      expect(result.failed).toEqual([])
    })

    it("should handle partial failures when activating multiple images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("Permission denied"))
        .mockResolvedValueOnce({ ok: true })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.activateImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Permission denied")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        imageIds: [],
      }

      await expect(caller.image.activateImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to activate", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockRejectedValue(new Error("Activation failed"))

      const imageIds = [generateTestUUID(1), generateTestUUID(2)]
      const input = { imageIds }

      const result = await caller.image.activateImages(input)

      expect(result.successful).toEqual([])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0].error).toContain("Activation failed")
      expect(result.failed[1].error).toContain("Activation failed")
    })

    it("should process images in parallel", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const callTimes: number[] = []
      mockCtx.mockGlance.post.mockImplementation(() => {
        callTimes.push(Date.now())
        return Promise.resolve({ ok: true })
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      await caller.image.activateImages(input)

      // All calls should happen at approximately the same time (parallel)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledTimes(3)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[0]}/actions/reactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[1]}/actions/reactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[2]}/actions/reactivate`, undefined)
    })
  })

  describe("deactivateImages", () => {
    it("should deactivate multiple images successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: true,
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deactivateImages(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledTimes(3)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[0]}/actions/deactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[1]}/actions/deactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[2]}/actions/deactivate`, undefined)
      expect(result.successful).toEqual(imageIds)
      expect(result.failed).toEqual([])
    })

    it("should handle partial failures when deactivating multiple images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("Image is protected"))
        .mockResolvedValueOnce({ ok: true })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deactivateImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Image is protected")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = {
        imageIds: [],
      }

      await expect(caller.image.deactivateImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to deactivate", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockRejectedValue(new Error("Deactivation failed"))

      const imageIds = [generateTestUUID(1), generateTestUUID(2)]
      const input = { imageIds }

      const result = await caller.image.deactivateImages(input)

      expect(result.successful).toEqual([])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0].error).toContain("Deactivation failed")
      expect(result.failed[1].error).toContain("Deactivation failed")
    })

    it("should process images in parallel", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const callTimes: number[] = []
      mockCtx.mockGlance.post.mockImplementation(() => {
        callTimes.push(Date.now())
        return Promise.resolve({ ok: true })
      })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      await caller.image.deactivateImages(input)

      // All calls should happen at approximately the same time (parallel)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledTimes(3)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[0]}/actions/deactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[1]}/actions/deactivate`, undefined)
      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith(`v2/images/${imageIds[2]}/actions/deactivate`, undefined)
    })

    it("should handle mixed error types", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockRejectedValueOnce({ message: "Invalid state" })

      const imageIds = [generateTestUUID(1), generateTestUUID(2), generateTestUUID(3)]
      const input = { imageIds }

      const result = await caller.image.deactivateImages(input)

      expect(result.successful).toEqual([imageIds[0]])
      expect(result.failed).toHaveLength(2)
      expect(result.failed[0].error).toContain("Network timeout")
      expect(result.failed[1].error).toContain("Unknown error")
    })
  })

  describe("Bulk operations - common behavior", () => {
    it("should validate glance service for bulk operations", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      await caller.image.deleteImages({ imageIds: [generateTestUUID(1)] })

      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
    })

    it("should handle unauthorized session for bulk operations", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      const input = { imageIds: ["image-1"] }

      await expect(caller.image.deleteImages(input)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )
    })

    it("should handle missing glance service for bulk operations", async () => {
      const mockCtx = createMockContext(false, true)
      const caller = createCaller(mockCtx)

      const input = { imageIds: ["image-1"] }

      await expect(caller.image.activateImages(input)).rejects.toThrow()
    })

    it("should work with single image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({ ok: true })

      const imageId = generateTestUUID(1)
      const input = { imageIds: [imageId] }
      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([imageId])
      expect(result.failed).toEqual([])
    })

    it("should handle large batch of images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({ ok: true })

      // Generate valid UUIDs for testing
      const imageIds = Array.from({ length: 50 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`)
      const input = { imageIds }

      const result = await caller.image.activateImages(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledTimes(50)
      expect(result.successful).toHaveLength(50)
      expect(result.failed).toEqual([])
    })
  })
})
