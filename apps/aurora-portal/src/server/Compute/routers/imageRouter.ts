import { z } from "zod"
import EventEmitter from "node:events"
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

  uploadImage: protectedProcedure.mutation(async (opts): Promise<{ success: boolean; imageId: string }> => {
    return withErrorHandling(async () => {
      const { uploadedFile, formFields } = opts.ctx

      const { imageId, fileBuffer } = validateUploadInput(formFields?.imageId, uploadedFile?.buffer)

      const openstackSession = opts.ctx.openstack
      const glance = openstackSession?.service("glance")

      validateGlanceService(glance)

      uploadProgress.set(imageId, { uploaded: 0, total: fileBuffer.length })

      const progress = uploadProgress.get(imageId)!

      const CHUNK_SIZE = 64 * 1024 // 64KB

      // Create a custom ReadableStream that emits buffer in chunks
      const uploadStream = new ReadableStream({
        async start(controller) {
          try {
            let offset = 0

            while (offset < fileBuffer.length) {
              const chunk = fileBuffer.subarray(offset, offset + CHUNK_SIZE)
              progress.uploaded += chunk.length

              // Emit progress event for real-time updates
              uploadProgressEmitter.emit(`progress:${imageId}`, {
                uploaded: progress.uploaded,
                total: progress.total,
                percent: Math.round((progress.uploaded / progress.total) * 100),
              })

              controller.enqueue(chunk)
              offset += CHUNK_SIZE

              // Yield control to allow progress queries to run between chunks
              await new Promise((resolve) => setTimeout(resolve, 0))
            }

            controller.close()
            uploadProgressEmitter.emit(`progress:${imageId}:complete`)
          } catch (error) {
            controller.error(error)
            uploadProgressEmitter.emit(`progress:${imageId}:error`, error)
          }
        },
      })

      await glance
        .put(`v2/images/${imageId}/file`, uploadStream, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/octet-stream",
          },
        })
        .catch((error) => {
          throw ImageErrorHandlers.upload(error, imageId, "application/octet-stream")
        })
        .finally(() => {
          uploadProgress.delete(imageId)
        })

      return { success: true, imageId }
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
        percent: Math.round((current.uploaded / current.total) * 100),
      }
    }

    // Create a queue to bridge EventEmitter events to async generator
    const queue: Array<UploadProgress> = []
    let isComplete = false
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

    // Listen to events from upload chunks (real-time, no polling)
    uploadProgressEmitter.on(`progress:${uploadId}`, onProgress)
    uploadProgressEmitter.on(`progress:${uploadId}:complete`, onComplete)

    try {
      // Yield queued events as they arrive
      while (!isComplete || queue.length > 0) {
        // Yield all queued events
        while (queue.length > 0) {
          yield queue.shift()
        }

        // Wait for next event without timeout (truly real-time)
        if (!isComplete) {
          await new Promise((resolve) => {
            waitResolver = resolve
          })
        }
      }
    } finally {
      // Cleanup listeners
      uploadProgressEmitter.off(`progress:${uploadId}`, onProgress)
      uploadProgressEmitter.off(`progress:${uploadId}:complete`, onComplete)
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

        const response = await glance.post(`v2/images/${imageId}/members`, {
          json: { member },
        })

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

        const response = await glance.put(`v2/images/${imageId}/members/${memberId}`, {
          json: { status },
        })

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
