import { z } from "zod"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { TRPCError } from "@trpc/server"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import EventEmitter from "node:events"
import { Readable, Transform } from "node:stream"
import { projectScopedProcedure } from "../../trpc"
import {
  applyImageQueryParams,
  validateGlanceService,
  mapErrorResponseToTRPCError,
  ImageErrorHandlers,
  handleZodParsingError,
  withErrorHandling,
  validateBulkImageIds,
  processBulkOperation,
  validateUploadInput,
  parseMultiValue,
} from "../helpers/imageHelpers"
import {
  imageResponseSchema,
  imageSchema,
  GlanceImage,
  createImageInputSchema,
  updateImageInputSchema,
  updateImageVisibilityInputSchema,
  deleteImageInputSchema,
  ListImagesInput,
  imagesPaginatedResponseSchema,
  ImagesPaginatedResponse,
  imagesPaginatedInputSchema,
  getImageByIdInputSchema,
  deactivateImageInputSchema,
  reactivateImageInputSchema,
  listImageMembersInputSchema,
  getImageMemberInputSchema,
  createImageMemberInputSchema,
  updateImageMemberInputSchema,
  deleteImageMemberInputSchema,
  imageMembersResponseSchema,
  imageMemberSchema,
  ImageMember,
  deleteImagesInputSchema,
  activateImagesInputSchema,
  deactivateImagesInputSchema,
  BulkOperationResult,
  memberStatusSchema,
} from "../types/image"

// Create a global event emitter for upload progress
const uploadProgressEmitter = new EventEmitter()

// Store upload progress
type UploadProgress = { uploaded: number; total: number; percent?: number }
const uploadProgress = new Map<string, UploadProgress>()

export const imageRouter = {
  listImagesWithSearch: projectScopedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      return withErrorHandling(async () => {
        const { marker, ...queryInput } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Configuration for intelligent pagination
        const FRONTEND_PAGE_SIZE = 50
        const OPENSTACK_PAGE_SIZE = 100
        const MIN_RESULTS_WHEN_SEARCHING = 50
        const MAX_PAGES_TO_SEARCH = 1000 // Safety limit to prevent infinite loops

        const allImages: GlanceImage[] = []
        const hasSearchTerm = queryInput.name && queryInput.name.trim()

        // Build query params
        const queryParams = new URLSearchParams()
        const minimalQuery = {
          sort_key: queryInput.sort_key,
          sort_dir: queryInput.sort_dir,
          sort: queryInput.sort,
          limit: OPENSTACK_PAGE_SIZE,
          marker: marker,
        }
        applyImageQueryParams(queryParams, minimalQuery as ListImagesInput)

        let currentUrl: string | undefined = `v2/images?${queryParams.toString()}`
        let pageCount = 0
        let nextMarker: string | undefined

        // Fetch pages from OpenStack
        while (currentUrl && pageCount < MAX_PAGES_TO_SEARCH) {
          const response = await glance.get(currentUrl).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "list images" })
          })

          const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
          if (!parsedData.success) {
            throw handleZodParsingError(parsedData.error, "list images")
          }

          allImages.push(...parsedData.data.images)
          pageCount++

          if (hasSearchTerm) {
            // Apply BFF-side filtering to current batch to check if we have enough results
            let filteredSoFar = filterBySearchParams(allImages, queryInput.name, ["name"])

            if (queryInput.visibility && queryInput.visibility !== "all") {
              filteredSoFar = filteredSoFar.filter((img) => img.visibility === queryInput.visibility)
            }
            if (queryInput.status) {
              const values = parseMultiValue(queryInput.status)
              filteredSoFar = filteredSoFar.filter((img) => values.includes(img.status ?? ""))
            }
            if (queryInput.disk_format) {
              const values = parseMultiValue(queryInput.disk_format)
              filteredSoFar = filteredSoFar.filter((img) => values.includes(img.disk_format ?? ""))
            }
            if (queryInput.container_format) {
              const values = parseMultiValue(queryInput.container_format)
              filteredSoFar = filteredSoFar.filter((img) => values.includes(img.container_format ?? ""))
            }
            if (queryInput.protected !== undefined && queryInput.protected !== null) {
              const wantProtected = queryInput.protected === "true"
              filteredSoFar = filteredSoFar.filter((img) => !!img.protected === wantProtected)
            }
            if (queryInput.owner) {
              filteredSoFar = filteredSoFar.filter((img) => img.owner === queryInput.owner)
            }

            // If we have enough results, stop fetching but remember next page
            if (filteredSoFar.length >= MIN_RESULTS_WHEN_SEARCHING) {
              nextMarker = parsedData.data.next
              break
            }
          }

          // For non-search queries, just fetch one OpenStack page
          if (!hasSearchTerm) {
            nextMarker = parsedData.data.next
            break
          }

          currentUrl = parsedData.data.next
        }

        // Apply BFF-side filtering to all collected images
        let filteredImages = allImages

        // Filter by name (search)
        if (hasSearchTerm) {
          filteredImages = filterBySearchParams(filteredImages, queryInput.name, ["name"])
        }

        // Filter by visibility (unless "all")
        if (queryInput.visibility && queryInput.visibility !== "all") {
          filteredImages = filteredImages.filter((img) => img.visibility === queryInput.visibility)
        }

        // Filter by status (supports multi-value "in:active,queued" format)
        if (queryInput.status) {
          const statusValues = parseMultiValue(queryInput.status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }

        // Filter by disk_format (supports multi-value "in:qcow2,raw" format)
        if (queryInput.disk_format) {
          const diskFormatValues = parseMultiValue(queryInput.disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }

        // Filter by container_format (supports multi-value "in:bare,ovf" format)
        if (queryInput.container_format) {
          const containerFormatValues = parseMultiValue(queryInput.container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }

        // Filter by protected ("true" / "false" string)
        if (queryInput.protected !== undefined && queryInput.protected !== null) {
          const wantProtected = queryInput.protected === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        // Filter by owner
        if (queryInput.owner) {
          filteredImages = filteredImages.filter((img) => img.owner === queryInput.owner)
        }

        // Implement frontend pagination
        const startIndex = 0
        const endIndex = FRONTEND_PAGE_SIZE
        const paginatedImages = filteredImages.slice(startIndex, endIndex)

        // Determine if there's a next page
        const hasMore = filteredImages.length > FRONTEND_PAGE_SIZE || !!nextMarker
        const nextPageMarker =
          filteredImages.length > FRONTEND_PAGE_SIZE ? filteredImages[FRONTEND_PAGE_SIZE - 1]?.id : nextMarker

        return {
          images: paginatedImages,
          first: undefined,
          next: hasMore ? nextPageMarker : undefined,
          schema: "/v2/schemas/images",
        }
      }, "list images")
    }),

  listImagesWithPagination: projectScopedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      return withErrorHandling(async () => {
        const { first, next, ...queryInput } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Always fetch ALL images from OpenStack (no pagination)
        const allImages: GlanceImage[] = []

        // Fetch all images without filters (except sorting) - we'll filter in BFF
        const queryParams = new URLSearchParams()
        const minimalQuery = {
          sort_key: queryInput.sort_key,
          sort_dir: queryInput.sort_dir,
          sort: queryInput.sort,
          limit: undefined, // Remove limit to fetch all pages
        }
        applyImageQueryParams(queryParams, minimalQuery as ListImagesInput)

        // Use first, next, or build URL from params
        let currentUrl: string | undefined = first || next || `v2/images?${queryParams.toString()}`
        let pageCount = 0
        const MAX_PAGES = 1000 // Safety limit to prevent infinite loops

        // Fetch all pages from OpenStack
        while (currentUrl && pageCount < MAX_PAGES) {
          const response = await glance.get(currentUrl).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "list images with pagination" })
          })

          const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
          if (!parsedData.success) {
            throw handleZodParsingError(parsedData.error, "list images with pagination")
          }

          allImages.push(...parsedData.data.images)
          currentUrl = parsedData.data.next
          pageCount++
        }

        // Apply BFF-side filtering
        let filteredImages = allImages

        // Filter by name (search)
        if (queryInput.name && queryInput.name.trim()) {
          filteredImages = filterBySearchParams(filteredImages, queryInput.name, ["name"])
        }

        // Filter by visibility (unless "all")
        if (queryInput.visibility && queryInput.visibility !== "all") {
          filteredImages = filteredImages.filter((img) => img.visibility === queryInput.visibility)
        }

        // Filter by status (supports multi-value "in:active,queued" format)
        if (queryInput.status) {
          const statusValues = parseMultiValue(queryInput.status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }

        // Filter by disk_format (supports multi-value "in:qcow2,raw" format)
        if (queryInput.disk_format) {
          const diskFormatValues = parseMultiValue(queryInput.disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }

        // Filter by container_format (supports multi-value "in:bare,ovf" format)
        if (queryInput.container_format) {
          const containerFormatValues = parseMultiValue(queryInput.container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }

        // Filter by protected ("true" / "false" string)
        if (queryInput.protected !== undefined && queryInput.protected !== null) {
          const wantProtected = queryInput.protected === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        // Filter by owner
        if (queryInput.owner) {
          filteredImages = filteredImages.filter((img) => img.owner === queryInput.owner)
        }

        // Return all filtered results (no pagination)
        return {
          images: filteredImages,
          first: undefined,
          next: undefined,
          schema: "/v2/schemas/images",
        }
      }, "list images with pagination")
    }),

  getImageById: projectScopedProcedure
    .input(getImageByIdInputSchema)
    .query(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}`).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "fetch image", imageId })
        })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "fetch image by ID")
        }

        return parsedData.data
      }, "fetch image by ID")
    }),

  createImage: projectScopedProcedure
    .input(createImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { ...imageData } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post("v2/images", imageData).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "create image" })
        })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image")
        }

        return parsedData.data
      }, "create image")
    }),

  uploadImage: projectScopedProcedure.mutation(async ({ ctx }): Promise<{ success: boolean; imageId: string }> => {
    return withErrorHandling(async () => {
      const glance = ctx.openstack?.service("glance")

      // Validate Glance service is available
      validateGlanceService(glance)

      const parts = ctx.getMultipartData()
      let imageId: string | undefined
      let fileSize: number | undefined
      let fileStream: NodeJS.ReadableStream | undefined
      const metadata: Record<string, string> = {}

      // Consume parts one by one
      for await (const part of parts) {
        if (part.type === "field") {
          switch (part.fieldname) {
            case "imageId":
              imageId = part.value
              break
            case "fileSize":
              fileSize = parseInt(part.value, 10)
              break
            default:
              metadata[part.fieldname] = part.value
          }
        } else if (part.type === "file") {
          fileStream = part.file
          // Note: We break here because we found the file
          // The file is expected to be the last part in the multipart form data (FormData append order is preserved)
          break
        }
      }

      // Validate required inputs (imageId, file size and type)
      const { validatedImageId, validatedFileSize, validatedFile } = validateUploadInput(imageId, fileSize, fileStream)

      // Initialize progress tracking
      uploadProgress.set(validatedImageId, {
        uploaded: 0,
        total: validatedFileSize,
      })

      try {
        const progress = uploadProgress.get(validatedImageId)!

        // Create a Transform stream to track progress
        // This doesn't buffer - it just observes chunks as they flow through
        const progressTracker = new Transform({
          async transform(chunk: Buffer, encoding, callback) {
            progress.uploaded += chunk.length

            // Emit progress event for real-time subscription updates
            uploadProgressEmitter.emit(`progress:${validatedImageId}`, {
              uploaded: progress.uploaded,
              total: progress.total,
              percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
            })

            // Yield control to allow progress subscriptions to run between chunks
            // This is important for real-time updates without blocking
            await new Promise((resolve) => setTimeout(resolve, 0))

            // Pass the chunk through unmodified
            callback(null, chunk)
          },
        })

        // Convert Node.js stream to Web Stream API
        // Pipe through progress tracker before converting
        const trackedStream = validatedFile.pipe(progressTracker)
        const webStream = Readable.toWeb(trackedStream)

        // Upload to Glance with progress tracking
        await glance.put(`v2/images/${validatedImageId}/file`, webStream, {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        })

        // Emit completion event
        uploadProgressEmitter.emit(`progress:${validatedImageId}:complete`)

        return {
          success: true,
          imageId: validatedImageId,
        }
      } catch (error) {
        // Emit error event for subscriptions
        uploadProgressEmitter.emit(`progress:${validatedImageId}:error`, error)

        throw ImageErrorHandlers.upload(error as SignalOpenstackApiError, validatedImageId, "application/octet-stream")
      } finally {
        // Always cleanup progress tracking
        uploadProgress.delete(validatedImageId)
      }
    }, "upload image")
  }),

  watchUploadProgress: projectScopedProcedure.input(z.object({ uploadId: z.string() })).subscription(async function* ({
    input,
  }) {
    const uploadId = input.uploadId

    // Emit current progress state immediately (no delay)
    const current = uploadProgress.get(uploadId)
    if (current) {
      yield {
        ...current,
        percent: current.total > 0 ? Math.round((current.uploaded / current.total) * 100) : 0,
      }
    }

    // Create a queue to bridge EventEmitter events to async generator
    const queue: Array<UploadProgress> = []
    let isComplete = false
    let isError = false
    let error: Error | undefined
    let waitResolver: ((value?: unknown) => void) | null = null

    const onProgress = (data: UploadProgress) => {
      queue.push(data)
      // Wake up the generator immediately when event arrives
      waitResolver?.()
      waitResolver = null
    }

    const onComplete = () => {
      isComplete = true
      waitResolver?.()
      waitResolver = null
    }

    const onError = (err: unknown) => {
      isError = true
      error = err instanceof Error ? err : new Error(String(err))
      waitResolver?.()
      waitResolver = null
    }

    // Listen to events from upload chunks (real-time, no polling)
    uploadProgressEmitter.on(`progress:${uploadId}`, onProgress)
    uploadProgressEmitter.on(`progress:${uploadId}:complete`, onComplete)
    uploadProgressEmitter.on(`progress:${uploadId}:error`, onError)

    try {
      // Yield queued events as they arrive
      while (!isComplete && !isError) {
        // Yield all queued events first
        while (queue.length > 0) {
          const progress = queue.shift()!
          yield {
            ...progress,
            percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
          }
        }

        // Wait for next event without timeout (truly real-time)
        if (!isComplete && !isError) {
          await new Promise((resolve) => {
            waitResolver = resolve
          })
        }
      }

      // Yield any final queued events
      while (queue.length > 0) {
        const progress = queue.shift()!
        yield {
          ...progress,
          percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
        }
      }

      // If there was an error, throw it
      if (isError && error) {
        throw error
      }
    } finally {
      // Cleanup listeners
      uploadProgressEmitter.off(`progress:${uploadId}`, onProgress)
      uploadProgressEmitter.off(`progress:${uploadId}:complete`, onComplete)
      uploadProgressEmitter.off(`progress:${uploadId}:error`, onError)
    }
  }),

  updateImage: projectScopedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId, operations } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Correct signature: patch(path, values, options)
        // - path: the API endpoint
        // - values: the body content (will be JSON.stringified by client)
        // - options: request options including headers
        const response = await glance
          .patch(
            `v2/images/${imageId}`,
            operations, // Pass operations array directly as the body
            {
              headers: {
                "Content-Type": "application/openstack-images-v2.1-json-patch",
              },
            }
          )
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "update image", imageId })
          })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image")
        }

        return parsedData.data
      }, "update image")
    }),

  updateImageVisibility: projectScopedProcedure
    .input(updateImageVisibilityInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId, visibility } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const operations = [
          {
            op: "replace" as const,
            path: "/visibility",
            value: visibility,
          },
        ]

        // Correct signature: patch(path, values, options)
        const response = await glance.patch(
          `v2/images/${imageId}`,
          operations, // Pass operations array directly
          {
            headers: {
              "Content-Type": "application/openstack-images-v2.1-json-patch",
            },
          }
        )

        if (!response?.ok) {
          throw ImageErrorHandlers.visibility(response, imageId, visibility)
        }

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image visibility")
        }

        return parsedData.data
      }, "update image visibility")
    }),

  deleteImage: projectScopedProcedure.input(deleteImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { imageId } = input
      const openstackSession = ctx.openstack
      const glance = openstackSession?.service("glance")

      validateGlanceService(glance)

      const response = await glance.del(`v2/images/${imageId}`)

      if (!response?.ok) {
        throw ImageErrorHandlers.delete(response, imageId)
      }

      return true
    }, "delete image")
  }),

  deactivateImage: projectScopedProcedure
    .input(deactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        await glance.post(`v2/images/${imageId}/actions/deactivate`, undefined).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "deactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        })

        return true
      }, "deactivate image")
    }),

  reactivateImage: projectScopedProcedure
    .input(reactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        await glance.post(`v2/images/${imageId}/actions/reactivate`, undefined).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "reactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        })

        return true
      }, "reactivate image")
    }),

  listImageMembers: projectScopedProcedure
    .input(listImageMembersInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember[]> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}/members`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.list(response, imageId)
        }

        const parsedData = imageMembersResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list image members")
        }

        return parsedData.data.members
      }, "list image members")
    }),

  getImageMember: projectScopedProcedure
    .input(getImageMemberInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, memberId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.get(response, imageId, memberId)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "get image member")
        }

        return parsedData.data
      }, "get image member")
    }),

  createImageMember: projectScopedProcedure
    .input(createImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, member } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post(`v2/images/${imageId}/members`, { member })

        if (!response?.ok) {
          throw ImageErrorHandlers.member.create(response, imageId, member)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image member")
        }

        return parsedData.data
      }, "create image member")
    }),

  updateImageMember: projectScopedProcedure
    .input(updateImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, memberId, status } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.put(`v2/images/${imageId}/members/${memberId}`, { status })

        if (!response?.ok) {
          throw ImageErrorHandlers.member.update(response, imageId, memberId, status)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image member")
        }

        return parsedData.data
      }, "update image member")
    }),

  deleteImageMember: projectScopedProcedure
    .input(deleteImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId, memberId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.del(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.delete(response, imageId, memberId)
        }

        return true
      }, "delete image member")
    }),

  deleteImages: projectScopedProcedure
    .input(deleteImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "delete images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process deletions in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            const response = await glance.del(`v2/images/${item.id}`)

            if (!response?.ok) {
              throw new Error(`${response?.status || "Unknown error"}`)
            }
          },
          { operation: "delete" }
        )
      }, "delete images")
    }),

  activateImages: projectScopedProcedure
    .input(activateImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "activate images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process activations in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            await glance.post(`v2/images/${item.id}/actions/reactivate`, undefined)
          },
          { operation: "activate" }
        )
      }, "activate images")
    }),

  deactivateImages: projectScopedProcedure
    .input(deactivateImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "deactivate images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process deactivations in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            await glance.post(`v2/images/${item.id}/actions/deactivate`, undefined)
          },
          { operation: "deactivate" }
        )
      }, "deactivate images")
    }),

  listSharedImagesByMemberStatus: projectScopedProcedure
    .input(
      z.object({
        memberStatus: memberStatusSchema,
        name: z.string().optional(),
        status: z.string().optional(),
        disk_format: z.string().optional(),
        container_format: z.string().optional(),
        protected: z.string().optional(),
        sort: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<GlanceImage[]> => {
      return withErrorHandling(async () => {
        const { memberStatus, name, status, disk_format, container_format, protected: protectedFilter, sort } = input

        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Get current project ID from token
        const token = openstackSession?.getToken()

        if (!token) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        }

        const projectId = token.tokenData.project?.id

        if (!projectId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unable to determine current project ID from OpenStack token",
          })
        }

        // Step 1: Fetch all images with visibility=shared and member_status=("pending" | "accepted" | "rejected")
        const queryParams = new URLSearchParams()
        queryParams.append("visibility", "shared")
        queryParams.append("member_status", memberStatus)
        if (sort) queryParams.append("sort", sort)

        const url = `v2/images?${queryParams.toString()}`
        const response = await glance.get(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list shared images by member status" })
        })

        const parsedData = imageResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list shared images by member status")
        }

        // Step 2: Filter out images owned by current project
        let filteredImages = parsedData.data.images.filter((image) => image.owner !== projectId)

        if (filteredImages.length === 0) {
          return []
        }

        // Step 3: Fetch member data for all remaining images using Promise.all
        const imageMembersPromises = filteredImages.map(
          (image) =>
            glance
              .get(`v2/images/${image.id}/members/${projectId}`)
              .then(async (response) => {
                if (response?.ok) {
                  const parsed = imageMemberSchema.safeParse(await response.json())
                  return parsed.success ? parsed.data : null
                }
                return null
              })
              .catch(() => null) // Handle cases where the image member doesn't exist
        )

        const imageMembers = await Promise.all(imageMembersPromises)

        // Step 4: Filter images by member_status
        filteredImages = filteredImages.filter((image, index) => {
          const member = imageMembers[index]
          return member?.status === memberStatus
        })

        // Step 5: Apply BFF-side filters (name search, status, disk_format, container_format, protected)
        if (name) {
          filteredImages = filterBySearchParams(filteredImages, name, ["name"])
        }
        if (status) {
          const statusValues = parseMultiValue(status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }
        if (disk_format) {
          const diskFormatValues = parseMultiValue(disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }
        if (container_format) {
          const containerFormatValues = parseMultiValue(container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }
        if (protectedFilter !== undefined && protectedFilter !== null) {
          const wantProtected = protectedFilter === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        return filteredImages
      }, "list shared images by member status")
    }),

  getImageMetadataExcludedProperties: projectScopedProcedure.query((): string[] => {
    const raw = process.env.IMAGE_METADATA_EXCLUDED_PROPERTIES ?? ""
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }),
}
