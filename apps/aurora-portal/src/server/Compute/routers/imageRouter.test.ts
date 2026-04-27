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

  const mockReqHeaders: Record<string, string> = {}

  return {
    req: { headers: mockReqHeaders } as unknown as import("fastify").FastifyRequest,
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    createSession: vi.fn().mockResolvedValue({}),
    terminateSession: vi.fn().mockResolvedValue({}),
    openstack: mockOpenstack,
    rescopeSession: vi.fn().mockResolvedValue({}),
    mockGlance,
    mockReqHeaders,
  } as unknown as AuroraPortalContext & {
    mockGlance: typeof mockGlance
    openstack: typeof mockOpenstack
    mockReqHeaders: Record<string, string>
  }
}

const createCaller = createCallerFactory(auroraRouter({ image: imageRouter }))

// Helper function to generate valid UUIDs for testing
const generateTestUUID = (id: number): string => {
  return `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`
}

describe("imageRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset withErrorHandling to pass through by default
    ;(imageHelpers.withErrorHandling as Mock).mockImplementation((fn) => fn())
  })

  describe("listImagesWithSearch", () => {
    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      const input = { project_id: "test-project-id" }

      await expect(caller.image.listImagesWithSearch(input)).rejects.toThrow(
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

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          schema: "/v2/schemas/images",
        }),
      })

      const input = { project_id: "test-project-id" }
      const result = await caller.image.listImagesWithSearch(input)

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("v2/images?"))
      expect(result.images).toEqual([mockGlanceImage])
    })

    it("should handle API error response", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Mock failed response
      mockCtx.mockGlance.get.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" })

      const input = { project_id: "test-project-id" }

      await expect(caller.image.listImagesWithSearch(input)).rejects.toThrow(
        "Failed to list images: Internal Server Error"
      )
    })

    it("should apply server-side name filtering", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const ubuntuImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu-22.04" }
      const centosImage = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos-stream-9" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ images: [ubuntuImage, centosImage] }),
      })

      const result = await caller.image.listImagesWithSearch({ name: "ubuntu" })

      expect(result.images).toEqual([ubuntuImage])
    })

    it("should not include name in the API URL query string", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ images: [mockGlanceImage] }),
      })

      await caller.image.listImagesWithSearch({ name: "ubuntu" })

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

      const result = await caller.image.listImagesWithSearch({})

      expect(result.images).toHaveLength(2)
    })

    it("should filter images by name server-side (substring match)", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const ubuntuImage = { ...mockGlanceImage, id: generateTestUUID(1), name: "ubuntu-22.04-lts" }
      const centosImage = { ...mockGlanceImage, id: generateTestUUID(2), name: "centos-stream-9" }
      const debianImage = { ...mockGlanceImage, id: generateTestUUID(3), name: "debian-12-bookworm" }

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [ubuntuImage, centosImage, debianImage],
          next: undefined, // Single page
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithSearch({ name: "ubuntu" })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe("ubuntu-22.04-lts")
    })

    it("should fetch multiple pages when searching until MIN_RESULTS_WHEN_SEARCHING is met", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Create 3 pages with ubuntu images scattered across them
      const page1 = Array.from({ length: 20 }, (_, i) => ({
        ...mockGlanceImage,
        id: generateTestUUID(i + 1),
        name: i % 5 === 0 ? `ubuntu-${i}` : `centos-${i}`, // 4 ubuntu images
      }))

      const page2 = Array.from({ length: 20 }, (_, i) => ({
        ...mockGlanceImage,
        id: generateTestUUID(i + 21),
        name: i % 4 === 0 ? `ubuntu-${i + 20}` : `debian-${i + 20}`, // 5 ubuntu images
      }))

      const page3 = Array.from({ length: 20 }, (_, i) => ({
        ...mockGlanceImage,
        id: generateTestUUID(i + 41),
        name: i % 3 === 0 ? `ubuntu-${i + 40}` : `fedora-${i + 40}`, // 7 ubuntu images
      }))

      mockCtx.mockGlance.get
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page1,
            next: "/v2/images?marker=page2",
            schema: "/v2/schemas/images",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page2,
            next: "/v2/images?marker=page3",
            schema: "/v2/schemas/images",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page3,
            next: undefined, // Last page
            schema: "/v2/schemas/images",
          }),
        })

      const result = await caller.image.listImagesWithSearch({ name: "ubuntu" })

      // Should fetch all 3 pages and filter for ubuntu
      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(3)
      const ubuntuImages = result.images.filter((img) => img.name?.includes("ubuntu"))
      expect(ubuntuImages.length).toBeGreaterThan(0)
      // Should only return first 50 results (FRONTEND_PAGE_SIZE)
      expect(result.images.length).toBeLessThanOrEqual(50)
    })

    it("should stop fetching pages when MIN_RESULTS_WHEN_SEARCHING is reached", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Create many pages, but only mock first 2
      const createUbuntuPage = (startId: number) =>
        Array.from({ length: 30 }, (_, i) => ({
          ...mockGlanceImage,
          id: generateTestUUID(startId + i),
          name: `ubuntu-${startId + i}`,
        }))

      mockCtx.mockGlance.get
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: createUbuntuPage(1), // 30 ubuntu images
            next: "/v2/images?marker=page2",
            schema: "/v2/schemas/images",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: createUbuntuPage(31), // 30 more ubuntu images = 60 total
            next: "/v2/images?marker=page3", // Has more pages
            schema: "/v2/schemas/images",
          }),
        })

      const result = await caller.image.listImagesWithSearch({ name: "ubuntu" })

      // Should stop after 2 pages because we have >= 50 matching results (MIN_RESULTS_WHEN_SEARCHING)
      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(2)
      expect(result.images).toHaveLength(50) // Returns FRONTEND_PAGE_SIZE
      expect(result.next).toBeDefined() // Should have next marker for more results
    })
  })

  describe("listImagesWithPagination", () => {
    it("should list images with pagination successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Mock single page response (no 'next' means last page)
      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          first: "/v2/images?sort=created_at:desc",
          next: undefined, // Explicitly no next page
          schema: "/v2/schemas/images",
        }),
      })

      const input = { project_id: "test-project-id" }
      const result = await caller.image.listImagesWithPagination(input)

      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalled()
      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith(expect.stringContaining("v2/images?"))
      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(1) // Only one page
      expect(result.images).toEqual([mockGlanceImage])
    })

    it("should fetch multiple pages and combine results", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const page1Images = [
        { ...mockGlanceImage, id: generateTestUUID(1), name: "image-1" },
        { ...mockGlanceImage, id: generateTestUUID(2), name: "image-2" },
      ]
      const page2Images = [
        { ...mockGlanceImage, id: generateTestUUID(3), name: "image-3" },
        { ...mockGlanceImage, id: generateTestUUID(4), name: "image-4" },
      ]
      const page3Images = [{ ...mockGlanceImage, id: generateTestUUID(5), name: "image-5" }]

      // Mock three pages of results
      mockCtx.mockGlance.get
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page1Images,
            next: "/v2/images?marker=id-2", // Has next page
            schema: "/v2/schemas/images",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page2Images,
            next: "/v2/images?marker=id-4", // Has next page
            schema: "/v2/schemas/images",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: page3Images,
            next: undefined, // Last page - no next
            schema: "/v2/schemas/images",
          }),
        })

      const result = await caller.image.listImagesWithPagination({})

      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(3)
      expect(result.images).toHaveLength(5)
      expect(result.images.map((img) => img.name)).toEqual(["image-1", "image-2", "image-3", "image-4", "image-5"])
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

      const input = { project_id: "test-project-id" }
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

      const input = { project_id: "test-project-id" }
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

    it("should respect MAX_PAGES safety limit to prevent infinite loops", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Mock a response that always has a 'next' URL (simulates infinite pagination bug)
      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [mockGlanceImage],
          next: "/v2/images?marker=endless", // Always returns a next page
          schema: "/v2/schemas/images",
        }),
      })

      const result = await caller.image.listImagesWithPagination({})

      // Should stop after MAX_PAGES (1000) even though 'next' is always present
      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(1000)
      expect(result.images).toHaveLength(1000)
    })

    it("should stop pagination when next is undefined even before MAX_PAGES", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      // Mock 5 pages, then stop
      const mockImages = Array.from({ length: 5 }, (_, i) => ({
        ...mockGlanceImage,
        id: generateTestUUID(i + 1),
      }))

      mockImages.forEach((img, index) => {
        mockCtx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            images: [img],
            next: index < 4 ? `/v2/images?marker=${index + 1}` : undefined, // Last page has no 'next'
            schema: "/v2/schemas/images",
          }),
        })
      })

      const result = await caller.image.listImagesWithPagination({})

      // Should stop at 5 pages (not 100) because 'next' became undefined
      expect(mockCtx.mockGlance.get).toHaveBeenCalledTimes(5)
      expect(result.images).toHaveLength(5)
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

      const input = { project_id: "test-project-id" }
      const result = await caller.image.getImageById(input)

      expect(mockCtx.mockGlance.get).toHaveBeenCalledWith("v2/images/123e4567-e89b-12d3-a456-426614174000")
      expect(result).toEqual(mockGlanceImage)
    })

    it("should handle not found error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockRejectedValue({ statusCode: 404, message: "Not Found" })

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }
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

      const input = { project_id: "test-project-id" }

      await expect(caller.image.createImage(input)).rejects.toThrow("Failed to create image")
    })
  })

  describe("uploadImage - Streaming with Progress Tracking", () => {
    /** Helper to set upload headers on the mock context. */
    const setUploadHeaders = (
      mockCtx: ReturnType<typeof createMockContext>,
      fields: { uploadId?: string; fileSize?: string }
    ) => {
      if (fields.uploadId) mockCtx.mockReqHeaders["x-upload-id"] = fields.uploadId
      if (fields.fileSize) mockCtx.mockReqHeaders["x-upload-size"] = fields.fileSize
    }

    // createCaller bypasses HTTP transport — octetInputParser never converts
    // Blob/File to ReadableStream. Pass a ReadableStream directly cast via `as never`.
    const callUpload = (caller: ReturnType<typeof createCaller>) =>
      caller.image.uploadImage(new ReadableStream() as never)

    describe("Valid uploads", () => {
      it("should upload image with header metadata successfully", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"

        setUploadHeaders(mockCtx, { uploadId: imageId, fileSize: String(1024 * 1024) })

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await callUpload(caller)

        expect(result).toEqual({ success: true, imageId })
        expect(mockCtx.mockGlance.put).toHaveBeenCalledWith(
          `v2/images/${imageId}/file`,
          expect.any(Object),
          expect.any(Object)
        )
      })

      it("should upload without fileSize header", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"

        setUploadHeaders(mockCtx, { uploadId: imageId })

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await callUpload(caller)

        expect(result).toEqual({ success: true, imageId })
      })

      it("should return success and imageId", async () => {
        const mockCtx = createMockContext()
        const imageId = "550e8400-e29b-41d4-a716-446655440000"

        setUploadHeaders(mockCtx, { uploadId: imageId })

        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockResolvedValue({ ok: true })

        const result = await callUpload(caller)

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("imageId", imageId)
      })
    })

    describe("ImageId validation", () => {
      it("should require imageId header", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        // No x-upload-id header set
        await expect(callUpload(caller)).rejects.toThrow("imageId is required")
      })

      it("should reject empty imageId header", async () => {
        const mockCtx = createMockContext()
        mockCtx.mockReqHeaders["x-upload-id"] = ""
        const caller = createCaller(mockCtx)
        await expect(callUpload(caller)).rejects.toThrow("imageId is required")
      })

      it("should reject whitespace-only imageId header", async () => {
        const mockCtx = createMockContext()
        mockCtx.mockReqHeaders["x-upload-id"] = "   "
        const caller = createCaller(mockCtx)
        await expect(callUpload(caller)).rejects.toThrow("imageId cannot be empty")
      })
    })

    describe("FileStream validation", () => {
      it("should reject when file stream is invalid", async () => {
        const mockCtx = createMockContext()
        setUploadHeaders(mockCtx, { uploadId: "550e8400-e29b-41d4-a716-446655440000" })
        const caller = createCaller(mockCtx)
        // Pass a non-stream value so validateUploadInput rejects it before reaching Glance
        await expect(caller.image.uploadImage({} as never)).rejects.toThrow()
        expect(mockCtx.mockGlance.put).not.toHaveBeenCalled()
      })
    })

    describe("Error handling", () => {
      it("should throw UNAUTHORIZED when session validation fails", async () => {
        const mockCtx = createMockContext(true)
        setUploadHeaders(mockCtx, { uploadId: "550e8400-e29b-41d4-a716-446655440000" })
        const caller = createCaller(mockCtx)
        await expect(callUpload(caller)).rejects.toThrow("The session is invalid")
      })

      it("should propagate error when Glance PUT fails", async () => {
        const mockCtx = createMockContext()
        setUploadHeaders(mockCtx, { uploadId: "550e8400-e29b-41d4-a716-446655440000" })
        const caller = createCaller(mockCtx)
        mockCtx.mockGlance.put.mockRejectedValue({ statusCode: 409, message: "Conflict" })
        await expect(callUpload(caller)).rejects.toThrow()
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
      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }
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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }
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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }
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

      const input = { project_id: "test-project-id" }

      await expect(caller.image.createImageMember(input)).rejects.toThrow("Create member failed")
    })
  })

  describe("Error handling and edge cases", () => {
    it("should validate glance service for all endpoints", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      await caller.image.listImagesWithSearch({})

      expect(imageHelpers.validateGlanceService).toHaveBeenCalled()
    })

    it("should handle missing glance service", async () => {
      const mockCtx = createMockContext(false, true)
      const caller = createCaller(mockCtx)

      const input = { project_id: "test-project-id" }

      await expect(caller.image.listImagesWithSearch(input)).rejects.toThrow()
    })

    it("should apply query parameters correctly", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.get.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [],
          schema: "/v2/schemas/images",
        }),
      })

      const input = { project_id: "test-project-id" }

      await caller.image.listImagesWithSearch(input)

      // Verify applyImageQueryParams was called with sorting params
      expect(imageHelpers.applyImageQueryParams).toHaveBeenCalledWith(
        expect.any(URLSearchParams),
        expect.objectContaining({
          sort: "name:asc",
          limit: 100,
        })
      )
    })
  })

  describe("deleteImages", () => {
    it("should delete multiple images successfully", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: true,
      })

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Network error")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { project_id: "test-project-id" }

      await expect(caller.image.deleteImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to delete", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

      const result = await caller.image.activateImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Permission denied")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { project_id: "test-project-id" }

      await expect(caller.image.activateImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to activate", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockRejectedValue(new Error("Activation failed"))

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

      const result = await caller.image.deactivateImages(input)

      expect(result.successful).toEqual([imageIds[0], imageIds[2]])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].imageId).toBe(imageIds[1])
      expect(result.failed[0].error).toContain("Image is protected")
    })

    it("should validate input requires at least one image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const input = { project_id: "test-project-id" }

      await expect(caller.image.deactivateImages(input)).rejects.toThrow()
    })

    it("should handle all images failing to deactivate", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockRejectedValue(new Error("Deactivation failed"))

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

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

      const input = { project_id: "test-project-id" }

      await expect(caller.image.activateImages(input)).rejects.toThrow()
    })

    it("should work with single image ID", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.del.mockResolvedValue({ ok: true })

      const imageId = generateTestUUID(1)
      const input = { project_id: "test-project-id" }
      const result = await caller.image.deleteImages(input)

      expect(result.successful).toEqual([imageId])
      expect(result.failed).toEqual([])
    })

    it("should handle large batch of images", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      mockCtx.mockGlance.post.mockResolvedValue({ ok: true })

      const input = { project_id: "test-project-id" }

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

    describe("BFF filters", () => {
      const setupWithImages = (ctx: ReturnType<typeof createMockContext>, images: GlanceImage[]) => {
        ctx.openstack.getToken = vi.fn().mockReturnValue({
          tokenData: { project: { id: currentProjectId } },
        })
        // First get: images list
        ctx.mockGlance.get.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ images }),
        })
        // Subsequent gets: member status for each image
        images.forEach((img) => {
          ctx.mockGlance.get.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
              ...memberWithAcceptedStatus,
              image_id: img.id,
              member_id: currentProjectId,
            }),
          })
        })
      }

      it("filters by name (substring match)", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const imgA = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(20), name: "ubuntu-22.04" }
        const imgB = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(21), name: "centos-stream-9" }
        setupWithImages(mockCtx, [imgA, imgB])

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted", name: "ubuntu" })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(imgA.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("name=")
      })

      it("filters by single status value", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const activeImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(22), status: "active" }
        const queuedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(23), status: "queued" }
        setupWithImages(mockCtx, [activeImg, queuedImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          status: "active",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(activeImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toMatch(/(?<!\w)status=/)
      })

      it("filters by multi-value status using in: prefix", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const activeImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(24), status: "active" }
        const queuedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(25), status: "queued" }
        const errorImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(26), status: "killed" }
        setupWithImages(mockCtx, [activeImg, queuedImg, errorImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          status: "in:active,queued",
        })

        expect(result).toHaveLength(2)
        expect(result.map((i) => i.id)).toContain(activeImg.id)
        expect(result.map((i) => i.id)).toContain(queuedImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toMatch(/(?<!\w)status=/)
      })

      it("filters by single disk_format value", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const qcow2Img = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(27), disk_format: "qcow2" }
        const rawImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(28), disk_format: "raw" }
        setupWithImages(mockCtx, [qcow2Img, rawImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          disk_format: "qcow2",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(qcow2Img.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("disk_format=")
      })

      it("filters by multi-value disk_format using in: prefix", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const qcow2Img = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(29), disk_format: "qcow2" }
        const rawImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(30), disk_format: "raw" }
        const vhdImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(31), disk_format: "vhd" }
        setupWithImages(mockCtx, [qcow2Img, rawImg, vhdImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          disk_format: "in:qcow2,raw",
        })

        expect(result).toHaveLength(2)
        expect(result.map((i) => i.id)).toContain(qcow2Img.id)
        expect(result.map((i) => i.id)).toContain(rawImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("disk_format=")
      })

      it("filters by single container_format value", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const bareImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(32), container_format: "bare" }
        const ovfImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(33), container_format: "ovf" }
        setupWithImages(mockCtx, [bareImg, ovfImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          container_format: "bare",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(bareImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("container_format=")
      })

      it("filters by multi-value container_format using in: prefix", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const bareImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(34), container_format: "bare" }
        const ovfImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(35), container_format: "ovf" }
        const amiImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(36), container_format: "ami" }
        setupWithImages(mockCtx, [bareImg, ovfImg, amiImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          container_format: "in:bare,ovf",
        })

        expect(result).toHaveLength(2)
        expect(result.map((i) => i.id)).toContain(bareImg.id)
        expect(result.map((i) => i.id)).toContain(ovfImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("container_format=")
      })

      it("filters by protected=true", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const protectedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(37), protected: true }
        const unprotectedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(38), protected: false }
        setupWithImages(mockCtx, [protectedImg, unprotectedImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          protected: "true",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(protectedImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("protected=")
      })

      it("filters by protected=false", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const protectedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(39), protected: true }
        const unprotectedImg = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(40), protected: false }
        setupWithImages(mockCtx, [protectedImg, unprotectedImg])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          protected: "false",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(unprotectedImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toContain("protected=")
      })

      it("combines multiple filters (status + disk_format)", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const matchImg = {
          ...sharedImageWithAcceptedStatus,
          id: generateTestUUID(41),
          status: "active",
          disk_format: "qcow2",
        }
        const wrongStatus = {
          ...sharedImageWithAcceptedStatus,
          id: generateTestUUID(42),
          status: "queued",
          disk_format: "qcow2",
        }
        const wrongFormat = {
          ...sharedImageWithAcceptedStatus,
          id: generateTestUUID(43),
          status: "active",
          disk_format: "raw",
        }
        setupWithImages(mockCtx, [matchImg, wrongStatus, wrongFormat])

        const result = await caller.image.listSharedImagesByMemberStatus({
          memberStatus: "accepted",
          status: "active",
          disk_format: "qcow2",
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(matchImg.id)
        const glanceUrl: string = mockCtx.mockGlance.get.mock.calls[0][0]
        expect(glanceUrl).not.toMatch(/(?<!\w)status=/)
        expect(glanceUrl).not.toContain("disk_format=")
      })

      it("returns all images when no BFF filters are provided", async () => {
        const mockCtx = createMockContext()
        const caller = createCaller(mockCtx)
        const imgA = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(44) }
        const imgB = { ...sharedImageWithAcceptedStatus, id: generateTestUUID(45) }
        setupWithImages(mockCtx, [imgA, imgB])

        const result = await caller.image.listSharedImagesByMemberStatus({ memberStatus: "accepted" })

        expect(result).toHaveLength(2)
      })
    })
  })
})
