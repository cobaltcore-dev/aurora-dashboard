import { describe, it, expect, vi, beforeEach, Mock } from "vitest"
import { TRPCError } from "@trpc/server"
import { AuroraPortalContext } from "../../context"
import { imageRouter } from "./imageRouter"
import * as imageHelpers from "../helpers/imageHelpers"
import { GlanceImage, ImageMember } from "../types/image"
import { createCallerFactory, auroraRouter } from "../../trpc"

// Mock the helpers
vi.mock("../helpers/imageHelpers", () => ({
  applyImageQueryParams: vi.fn(),
  validateGlanceService: vi.fn(),
  mapResponseToTRPCError: vi.fn(),
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
}))

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
      mockCtx.mockGlance.get.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "API Error" })
      ;(imageHelpers.mapResponseToTRPCError as Mock).mockReturnValue(mockError)

      const input = {}

      await expect(caller.image.listImages(input)).rejects.toThrow("API Error")
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

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "NOT_FOUND", message: "Image not found" })
      ;(imageHelpers.mapResponseToTRPCError as Mock).mockReturnValue(mockError)

      const input = { imageId: "123e4567-e89b-12d3-a456-426614174111" }

      await expect(caller.image.getImageById(input)).rejects.toThrow("Image not found")
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

      mockCtx.mockGlance.post.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn(),
      })

      const mockError = new TRPCError({ code: "BAD_REQUEST", message: "Create failed" })
      ;(imageHelpers.mapResponseToTRPCError as Mock).mockReturnValue(mockError)

      const input = {
        name: "new-image",
        container_format: "bare" as const,
        disk_format: "qcow2" as const,
      }

      await expect(caller.image.createImage(input)).rejects.toThrow("Create failed")
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

      mockCtx.mockGlance.put.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn(),
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

      expect(mockCtx.mockGlance.patch).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000", {
        json: operations,
        headers: { "Content-Type": "application/openstack-images-v2.1-json-patch" },
      })
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

      expect(mockCtx.mockGlance.patch).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000", {
        json: [{ op: "replace", path: "/visibility", value: "public" }],
        headers: { "Content-Type": "application/openstack-images-v2.1-json-patch" },
      })
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
})
