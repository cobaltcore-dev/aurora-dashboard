import { protectedProcedure } from "../../trpc"
import {
  applyImageQueryParams,
  validateGlanceService,
  mapErrorResponseToTRPCError,
  ImageErrorHandlers,
  handleZodParsingError,
  withErrorHandling,
} from "../helpers/imageHelpers"
import {
  imageResponseSchema,
  imageSchema,
  GlanceImage,
  createImageInputSchema,
  uploadImageInputSchema,
  updateImageInputSchema,
  updateImageVisibilityInputSchema,
  imageDetailResponseSchema,
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

        const response = await glance
          .post("v2/images", {
            json: imageData,
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "create image" })
          })

        const parsedData = imageDetailResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image")
        }

        return parsedData.data.image
      }, "create image")
    }),

  uploadImage: protectedProcedure.input(uploadImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { imageId, imageData, contentType } = input
      const openstackSession = ctx.openstack
      const glance = openstackSession?.service("glance")

      validateGlanceService(glance)

      // Convert the image data to the appropriate format for the request
      let body: ArrayBuffer | string
      if (typeof imageData === "string") {
        // If it's a base64 string, convert to ArrayBuffer
        const binaryString = atob(imageData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        body = bytes.buffer
      } else if (imageData instanceof Uint8Array) {
        body = imageData.buffer
      } else {
        body = imageData
      }

      await glance
        .put(`v2/images/${imageId}/file`, {
          body,
          headers: {
            "Content-Type": contentType,
          },
        })
        .catch((error) => {
          throw ImageErrorHandlers.upload(error, imageId, contentType)
        })

      return true
    }, "upload image")
  }),

  updateImage: protectedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId, operations } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance
          .patch(`v2/images/${imageId}`, {
            json: operations,
            headers: {
              "Content-Type": "application/openstack-images-v2.1-json-patch",
            },
          })
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

        const response = await glance.patch(`v2/images/${imageId}`, {
          json: operations,
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

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

        const results: BulkOperationResult = {
          successful: [],
          failed: [],
        }

        // Process deletions in parallel using Promise.allSettled
        const deletePromises = imageIds.map(async (imageId) => {
          try {
            const response = await glance.del(`v2/images/${imageId}`)

            if (!response?.ok) {
              return {
                status: "failed" as const,
                imageId,
                error: `Failed to delete image: ${response?.status || "Unknown error"}`,
              }
            }
            return { status: "success" as const, imageId }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            return {
              status: "failed" as const,
              imageId,
              error: `Failed to delete image: ${errorMessage}`,
            }
          }
        })

        const settledResults = await Promise.allSettled(deletePromises)

        // Process settled results
        settledResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value
            if (value.status === "success") {
              results.successful.push(value.imageId)
            } else {
              results.failed.push({ imageId: value.imageId, error: value.error })
            }
          } else {
            // Handle rejection from Promise.allSettled (shouldn't happen with try-catch inside)
            results.failed.push({
              imageId: "unknown",
              error: `Unexpected error: ${result.reason}`,
            })
          }
        })

        return results
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

        const results: BulkOperationResult = {
          successful: [],
          failed: [],
        }

        // Process activations in parallel using Promise.allSettled
        const activatePromises = imageIds.map(async (imageId) => {
          try {
            await glance.post(`v2/images/${imageId}/actions/reactivate`, undefined)
            return { status: "success" as const, imageId }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            return {
              status: "failed" as const,
              imageId,
              error: `Failed to activate image: ${errorMessage}`,
            }
          }
        })

        const settledResults = await Promise.allSettled(activatePromises)

        // Process settled results
        settledResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value
            if (value.status === "success") {
              results.successful.push(value.imageId)
            } else {
              results.failed.push({ imageId: value.imageId, error: value.error })
            }
          } else {
            // Handle rejection from Promise.allSettled (shouldn't happen with try-catch inside)
            results.failed.push({
              imageId: "unknown",
              error: `Unexpected error: ${result.reason}`,
            })
          }
        })

        return results
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

        const results: BulkOperationResult = {
          successful: [],
          failed: [],
        }

        // Process deactivations in parallel using Promise.allSettled
        const deactivatePromises = imageIds.map(async (imageId) => {
          try {
            await glance.post(`v2/images/${imageId}/actions/deactivate`, undefined)
            return { status: "success" as const, imageId }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            return {
              status: "failed" as const,
              imageId,
              error: `Failed to deactivate image: ${errorMessage}`,
            }
          }
        })

        const settledResults = await Promise.allSettled(deactivatePromises)

        // Process settled results
        settledResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value
            if (value.status === "success") {
              results.successful.push(value.imageId)
            } else {
              results.failed.push({ imageId: value.imageId, error: value.error })
            }
          } else {
            // Handle rejection from Promise.allSettled (shouldn't happen with try-catch inside)
            results.failed.push({
              imageId: "unknown",
              error: `Unexpected error: ${result.reason}`,
            })
          }
        })

        return results
      }, "deactivate images")
    }),
}
