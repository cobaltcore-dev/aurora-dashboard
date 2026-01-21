import { z } from "zod"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import EventEmitter from "node:events"
import { Readable, Transform } from "node:stream"
import { protectedProcedure } from "../../trpc"
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
} from "../helpers/imageHelpers"
import {
  imageResponseSchema,
  imageSchema,
  GlanceImage,
  createImageInputSchema,
  updateImageInputSchema,
  updateImageVisibilityInputSchema,
  deleteImageInputSchema,
  listImagesInputSchema,
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
} from "../types/image"

// Create a global event emitter for upload progress
const uploadProgressEmitter = new EventEmitter()

// Store upload progress
type UploadProgress = { uploaded: number; total: number; percent?: number }
const uploadProgress = new Map<string, UploadProgress>()

export const imageRouter = {
  listImages: protectedProcedure.input(listImagesInputSchema).query(async ({ input, ctx }): Promise<GlanceImage[]> => {
    return withErrorHandling(async () => {
      const { ...queryInput } = input
      const openstackSession = ctx.openstack
      const glance = openstackSession?.service("glance")

      validateGlanceService(glance)

      // Build query parameters using utility function
      const queryParams = new URLSearchParams()
      applyImageQueryParams(queryParams, queryInput)

      const url = `v2/images?${queryParams.toString()}`
      const response = await glance.get(url).catch((error) => {
        throw mapErrorResponseToTRPCError(error, { operation: "list images" })
      })

      const parsedData = imageResponseSchema.safeParse(await response.json())
      if (!parsedData.success) {
        throw handleZodParsingError(parsedData.error, "list images")
      }

      return parsedData.data.images
    }, "list images")
  }),

  listImagesWithPagination: protectedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      return withErrorHandling(async () => {
        const { first, next, ...queryInput } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Build query parameters using utility function
        const queryParams = new URLSearchParams()
        applyImageQueryParams(queryParams, queryInput)

        const url = first || next || `v2/images?${queryParams.toString()}`
        const response = await glance.get(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list images with pagination" })
        })

        const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list images with pagination")
        }

        return parsedData.data
      }, "list images with pagination")
    }),

  getImageById: protectedProcedure
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

  createImage: protectedProcedure
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

  uploadImage: protectedProcedure.mutation(async ({ ctx }): Promise<{ success: boolean; imageId: string }> => {
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

  watchUploadProgress: protectedProcedure.input(z.object({ uploadId: z.string() })).subscription(async function* ({
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

  updateImage: protectedProcedure
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

  updateImageVisibility: protectedProcedure
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

  deleteImage: protectedProcedure.input(deleteImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
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

  deactivateImage: protectedProcedure
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

  reactivateImage: protectedProcedure
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

  listImageMembers: protectedProcedure
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

  getImageMember: protectedProcedure
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

  createImageMember: protectedProcedure
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

  updateImageMember: protectedProcedure
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

  deleteImageMember: protectedProcedure
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

  deleteImages: protectedProcedure
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

  activateImages: protectedProcedure
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

  deactivateImages: protectedProcedure
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
}
