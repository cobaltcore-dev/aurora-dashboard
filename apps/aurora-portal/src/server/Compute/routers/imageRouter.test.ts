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
    filterImagesByName: vi.fn((images: GlanceImage[], name?: string) => {
      if (!name) return images
      const nameLower = name.toLowerCase()
      return images.filter((image) => image.name?.toLowerCase().includes(nameLower))
    }),
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

  const mockOpenstack = {
    service: vi.fn().mockReturnValue(shouldFailGlance ? null : mockGlance),
    getToken: vi.fn().mockReturnValue({
      tokenData: {
        project: {
          id: "default-project-id",
        },
      },
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    createSession: vi.fn().mockResolvedValue({}),
    terminateSession: vi.fn().mockResolvedValue({}),
    openstack: mockOpenstack,
    rescopeSession: vi.fn().mockResolvedValue({}),
    mockGlance,
  } as unknown as AuroraPortalContext & {
    mockGlance: typeof mockGlance
    openstack: typeof mockOpenstack
  }
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

    it("should apply server-side name filtering via filterImagesByName", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const ubuntuImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu-22.04" }
      const centosImage = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos-stream-9" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ images: [ubuntuImage, centosImage] }),
      })

      const result = await caller.image.listImages({ name: "ubuntu" })

      expect(imageHelpers.filterImagesByName).toHaveBeenCalledWith([ubuntuImage, centosImage], "ubuntu")
      expect(result).toEqual([ubuntuImage])
    })

    it("should not include name in the API URL query string", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ images: [mockGlanceImage] }),
      })

      await caller.image.listImages({ name: "ubuntu" })

      const calledUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
      expect(calledUrl).not.toContain("name=ubuntu")
    })

    it("should return all images when no name filter is provided", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const image1 = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu" }
      const image2 = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ images: [image1, image2] }),
      })

      const result = await caller.image.listImages({})

      expect(result).toHaveLength(2)
    })
  })

  describe("listImagesWithPagination", () => {
    it("should list images with pagination successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          first: "/v2/images?sort=created_at:desc",
          next: "/v2/images?sort=created_at:desc&marker=abc",
          schema: "/v2/schemas/images",
        }),
      })

      const input = {}
      const result = await caller.image.listImagesWithPagination(input)

      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("v2/images?"))
      expect(result.images).toEqual([mockGlanceImage])
    })

    it("should use `first` URL when provided, ignoring built query params", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const firstUrl = "/v2/images?sort=name:asc&limit=10"
      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          schema: "/v2/schemas/images",
        }),
      })

      const input = { first: firstUrl }
      await caller.image.listImagesWithPagination(input)

      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(firstUrl)
    })

    it("should use `next` URL when provided (and no `first`)", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const nextUrl = "/v2/images?sort=created_at:desc&marker=some-marker-id"
      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          schema: "/v2/schemas/images",
        }),
      })

      const input = { next: nextUrl }
      await caller.image.listImagesWithPagination(input)

      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(nextUrl)
    })

    it("should not include name in the API URL query string", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          schema: "/v2/schemas/images",
        }),
      })

      await caller.image.listImagesWithPagination({ name: "ubuntu" })

      const calledUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
      expect(calledUrl).not.toContain("name=ubuntu")
    })

    it("should filter images by name client-side via filterImagesByName (substring match)", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const ubuntuImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu-22.04-lts" }
      const centosImage = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos-stream-9" }
      const debianImage = { ...mockGlanceImage, id: generateTestUUID(3), name: "debian-12-bookworm" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [ubuntuImage, centosImage, debianImage],
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({ name: "ubuntu" })

      expect(imageHelpers.filterImagesByName).toHaveBeenCalledWith([ubuntuImage, centosImage, debianImage], "ubuntu")
      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe("ubuntu-22.04-lts")
    })

    it("should filter images by name client-side (case-insensitive)", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const ubuntuImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "Ubuntu-22.04-LTS" }
      const centosImage = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos-stream-9" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [ubuntuImage, centosImage],
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({ name: "ubuntu" })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe("Ubuntu-22.04-LTS")
    })

    it("should return empty images array when no names match the filter", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage], // name is "test-image"
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({ name: "nonexistent" })

      expect(result.images).toHaveLength(0)
    })

    it("should return all images when no name filter is provided", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const image1 = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu" }
      const image2 = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [image1, image2],
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({})

      expect(result.images).toHaveLength(2)
    })

    it("should handle images with null/undefined names during name filtering", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const namedImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu-22.04" }
      const unnamedImage = { ...mockGlanceImage, id: generateTestUUID(2), name: undefined }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [namedImage, unnamedImage],
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({ name: "ubuntu" })

      // Only the named image should match; the undefined-name image should be excluded
      expect(result.images).toHaveLength(1)
      expect(result.images[0].id).toBe(generateTestUUID(1))
    })

    it("should handle API error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" })

      await expect(caller.image.listImagesWithPagination({})).rejects.toThrow(
        "Failed to list images with pagination: Internal Server Error"
      )
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
        json: vi.fn().mockResolvedValue(mockGlanceImage),
      })

      const input = {
        name: "new-image",
        container_format: "bare" as const,
        disk_format: "qcow2" as const,
      }
      const result = await caller.image.createImage(input)

      expect(mockCtx.mockGlance.post).toHaveBeenCalledWith("v2/images", {
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

  describe("uploadImage - Streaming with Progress Tracking", () => {
    function createMockFileStream() {
      return {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
      }
    }

    describe("Valid uploads", () => {
      // SKIP: These tests require actual Node.js stream conversion
      // which doesn't work in test environment
      it.skip("should upload image with multipart stream data successfully", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileSize = 1024 * 1024
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "field" as const,
              fieldname: "fileSize",
              value: fileSize.toString(),
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result).toEqual({ success: true, imageId })
        expect(mockCtx.mockGlance.put).toHaveBeenCalled()
      })

      it.skip("should handle upload without fileSize field", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result).toEqual({ success: true, imageId })
      })

      it.skip("should trim whitespace from imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: `  ${imageId}  `,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(mockCtx.mockGlance.put).toHaveBeenCalledWith(
          `v2/images/${imageId}/file`,
          expect.any(Object),
          expect.any(Object)
        )
        expect(result.imageId).toBe(imageId)
      })

      it.skip("should return success and imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("imageId", imageId)
      })
    })

    describe("ImageId validation", () => {
      it("should require imageId", async () => {
        const mockCtx = createMockContext()
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("imageId is required")
      })

      it("should reject empty imageId", async () => {
        const mockCtx = createMockContext()
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: "",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("imageId is required")
      })

      it("should reject whitespace-only imageId", async () => {
        const mockCtx = createMockContext()
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: "   ",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("imageId cannot be empty")
      })
    })

    describe("FileStream validation", () => {
      it("should require file", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("File not uploaded")
      })

      it("should validate file has pipe method", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: { read: vi.fn() },
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("Invalid file stream format")
      })
    })

    describe("FileSize validation", () => {
      it.skip("should accept fileSize of 0", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "field" as const,
              fieldname: "fileSize",
              value: "0",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result.success).toBe(true)
      })

      it("should reject negative fileSize", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "field" as const,
              fieldname: "fileSize",
              value: "-1024",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("fileSize cannot be negative")
      })

      it("should reject non-numeric fileSize", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "field" as const,
              fieldname: "fileSize",
              value: "not-a-number",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow("fileSize must be a finite number")
      })
    })

    describe("Error handling", () => {
      it("should handle Glance upload errors", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockRejectedValue(new Error("Network error"))

        await expect(caller.image.uploadImage()).rejects.toThrow()
      })

      it("should validate glance service is available", async () => {
        const mockCtx = createMockContext(false, true)
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)

        await expect(caller.image.uploadImage()).rejects.toThrow()
      })
    })

    describe("Edge cases", () => {
      it.skip("should handle UUID format imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result.imageId).toBe(imageId)
      })

      it.skip("should handle alphanumeric imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "image-abc123"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result.imageId).toBe(imageId)
      })

      it.skip("should handle metadata fields alongside imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"
        const fileStream = createMockFileStream()

        mockCtx.getMultipartData = vi.fn().mockReturnValue(
          (async function* () {
            yield {
              type: "field" as const,
              fieldname: "imageId",
              value: imageId,
            }
            yield {
              type: "field" as const,
              fieldname: "name",
              value: "my-image",
            }
            yield {
              type: "field" as const,
              fieldname: "description",
              value: "Test image",
            }
            yield {
              type: "file" as const,
              filename: "test-image.iso",
              mimetype: "application/octet-stream",
              encoding: "7bit",
              file: fileStream,
            }
          })()
        )

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await caller.image.uploadImage()

        expect(result.imageId).toBe(imageId)
      })
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
        member: "test-member-id",
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

  describe("listSharedImagesByMemberStatus", () => {
    const currentProjectId = generateTestUUID(999)
    const ownerProjectId = generateTestUUID(1)
    const anotherOwnerProjectId = generateTestUUID(2)

    const sharedImageWithPendingStatus: GlanceImage = {
      ...mockGlanceImage,
      id: generateTestUUID(10),
      name: "shared-image-pending",
      visibility: "shared",
      owner: ownerProjectId,
    }

    const sharedImageWithAcceptedStatus: GlanceImage = {
      ...mockGlanceImage,
      id: generateTestUUID(11),
      name: "shared-image-accepted",
      visibility: "shared",
      owner: anotherOwnerProjectId,
    }

    const sharedImageWithRejectedStatus: GlanceImage = {
      ...mockGlanceImage,
      id: generateTestUUID(12),
      name: "shared-image-rejected",
      visibility: "shared",
      owner: generateTestUUID(3),
    }

    const memberWithPendingStatus: ImageMember = {
      ...mockImageMember,
      status: "pending",
      image_id: sharedImageWithPendingStatus.id,
      member_id: currentProjectId,
    }

    const memberWithAcceptedStatus: ImageMember = {
      ...mockImageMember,
      status: "accepted",
      image_id: sharedImageWithAcceptedStatus.id,
      member_id: currentProjectId,
    }

    const memberWithRejectedStatus: ImageMember = {
      ...mockImageMember,
      status: "rejected",
      image_id: sharedImageWithRejectedStatus.id,
      member_id: currentProjectId,
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe("Authentication & Authorization", () => {
      it("should throw UNAUTHORIZED when token is missing", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue(null)

        await expect(caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })).rejects.toThrow(
          new TRPCError({
            code: "UNAUTHORIZED",
            message: "No valid OpenStack token found",
          })
        )
      })

      it("should throw UNAUTHORIZED when projectId is missing from token", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: null },
        })

        await expect(caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })).rejects.toThrow(
          new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unable to determine current project ID from OpenStack token",
          })
        )
      })

      it("should validate glance service availability", async () => {
        const mockCtx = createMockContext(false, true)
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        await expect(caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })).rejects.toThrow()

        expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
      })
    })

    describe("API Query Parameters", () => {
      it("should include visibility=shared in query parameters", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [] }),
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("visibility=shared"))
      })

      it("should include member_status parameter in query for pending status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [] }),
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("member_status=pending"))
      })

      it("should include member_status parameter for accepted status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [] }),
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("member_status=accepted"))
      })

      it("should include member_status parameter for rejected status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [] }),
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "rejected" })

        expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("member_status=rejected"))
      })
    })

    describe("Empty Result Handling", () => {
      it("should return empty array when no shared images exist", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [] }),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        expect(result).toEqual([])
      })

      it("should return empty array when all images are owned by current project", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        const ownedImage: GlanceImage = {
          ...sharedImageWithPendingStatus,
          owner: currentProjectId,
        }

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [ownedImage] }),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        expect(result).toEqual([])
      })
    })

    describe("Owner Filtering", () => {
      it("should filter out images owned by current project", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        const ownedImage: GlanceImage = {
          ...sharedImageWithPendingStatus,
          id: generateTestUUID(20),
          owner: currentProjectId,
        }

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithPendingStatus, ownedImage, sharedImageWithAcceptedStatus],
          }),
        })

        // Mock member responses for non-owned images
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithPendingStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithPendingStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        // Should not include the owned image
        expect(result.every((img) => img.owner !== currentProjectId)).toBe(true)
        expect(result).toContainEqual(expect.objectContaining({ id: sharedImageWithPendingStatus.id }))
      })

      it("should include images from multiple different owners", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus, sharedImageWithRejectedStatus],
          }),
        })

        // Mock member responses
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(result).toHaveLength(2)
      })
    })

    describe("Member Status Filtering", () => {
      it("should return only images with pending member status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithPendingStatus, sharedImageWithAcceptedStatus, sharedImageWithRejectedStatus],
          }),
        })

        // Mock member responses
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithPendingStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithRejectedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(sharedImageWithPendingStatus.id)
      })

      it("should return only images with accepted member status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithPendingStatus, sharedImageWithAcceptedStatus, sharedImageWithRejectedStatus],
          }),
        })

        // Mock member responses
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithPendingStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithRejectedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(sharedImageWithAcceptedStatus.id)
      })

      it("should return only images with rejected member status", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithPendingStatus, sharedImageWithAcceptedStatus, sharedImageWithRejectedStatus],
          }),
        })

        // Mock member responses
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithPendingStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithRejectedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "rejected" })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(sharedImageWithRejectedStatus.id)
      })
    })

    describe("Member Data Fetching", () => {
      it("should fetch member data for each shared image using the current projectId", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus],
          }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(
          `v2/images/${sharedImageWithAcceptedStatus.id}/members/${currentProjectId}`
        )
      })

      it("should use Promise.all for parallel member data fetching", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus, sharedImageWithPendingStatus],
          }),
        })

        const callTimes: number[] = []
        mockCtx.mockGlance.get.mockImplementation(() => {
          callTimes.push(Date.now())
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
          })
        })

        await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        // Should have called for both member data at nearly the same time (parallel)
        expect(callTimes.length).toBeGreaterThanOrEqual(2)
      })

      it("should handle missing member data gracefully (404 response)", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus],
          }),
        })

        // Mock 404 response for member data
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: false,
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        // Should return empty since member data doesn't match the requested status
        expect(result).toEqual([])
      })

      it("should handle member fetch errors gracefully", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus, sharedImageWithPendingStatus],
          }),
        })

        // First member request throws error, second succeeds
        mockCtx.mockGlance.get.mockRejectedValueOnce(new Error("Network error"))

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        // Should return only the second image since first one failed to fetch
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(sharedImageWithPendingStatus.id)
      })

      it("should handle invalid member data (parsing error) gracefully", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [sharedImageWithAcceptedStatus],
          }),
        })

        // Mock response with invalid data
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ invalid: "data" }),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        // Should return empty since parsing failed
        expect(result).toEqual([])
      })
    })

    describe("Complex Scenarios", () => {
      it("should handle multiple images with all different statuses", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        const image1 = { ...sharedImageWithPendingStatus, id: generateTestUUID(101) }
        const image2 = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(102) }
        const image3 = { ...sharedImageWithRejectedStatus, id: generateTestUUID(103) }
        const image4 = { ...sharedImageWithPendingStatus, id: generateTestUUID(104) }

        const allImages = [image1, image2, image3, image4]

        // Setup for first call (pending)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: allImages }),
        })

        // Mock member responses for first call (pending)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image1.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithAcceptedStatus, image_id: image2.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithRejectedStatus, image_id: image3.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image4.id }),
        })

        // Setup for second call (accepted)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: allImages }),
        })

        // Mock member responses for second call (accepted)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image1.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithAcceptedStatus, image_id: image2.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithRejectedStatus, image_id: image3.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image4.id }),
        })

        // Setup for third call (rejected)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: allImages }),
        })

        // Mock member responses for third call (rejected)
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image1.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithAcceptedStatus, image_id: image2.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithRejectedStatus, image_id: image3.id }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ ...memberWithPendingStatus, image_id: image4.id }),
        })

        const resultPending = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })
        const resultAccepted = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })
        const resultRejected = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "rejected" })

        expect(resultPending).toHaveLength(2)
        expect(resultAccepted).toHaveLength(1)
        expect(resultRejected).toHaveLength(1)
      })

      it("should handle large batch of images", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        // Generate 20 images
        const images = Array.from({ length: 20 }, (_, i) => ({
          ...sharedImageWithAcceptedStatus,
          id: generateTestUUID(200 + i),
          owner: generateTestUUID(100 + i),
        }))

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images }),
        })

        // Mock all member responses with accepted status
        images.forEach(() => {
          mockCtx.mockGlance.get.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
          })
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(result).toHaveLength(20)
        // Verify all member fetch calls were made
        expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(21) // 1 for images + 20 for members
      })

      it("should preserve image data when filtering", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        const imageWithMetadata: GlanceImage = {
          ...sharedImageWithAcceptedStatus,
          size: 5368709120,
          min_disk: 10,
          min_ram: 2048,
          tags: ["test", "image"],
          disk_format: "qcow2",
          container_format: "bare",
        }

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images: [imageWithMetadata] }),
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(memberWithAcceptedStatus),
        })

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(result[0]).toEqual(imageWithMetadata)
        expect(result[0].size).toBe(5368709120)
        expect(result[0].tags).toEqual(["test", "image"])
      })
    })

    describe("Error Handling", () => {
      it("should handle API error when fetching images", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockRejectedValueOnce({ statusCode: 500, message: "Internal Server Error" })

        await expect(caller.image.listSharedImagesByMemberStatus({ memberStatus: "pending" })).rejects.toThrow()
      })

      it("should handle invalid response schema when fetching images", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)

        mockCtx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })

        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ invalid: "response" }),
        })

        await expect(caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })).rejects.toThrow()
      })
    })
  })
})
