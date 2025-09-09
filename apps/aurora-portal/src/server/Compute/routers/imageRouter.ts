import { protectedProcedure } from "../../trpc"
import {
  applyImageQueryParams,
  validateGlanceService,
  mapResponseToTRPCError,
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
} from "../types/image"

export const imageRouter = {
  listImages: protectedProcedure.input(listImagesInputSchema).query(async ({ input, ctx }): Promise<GlanceImage[]> => {
    return withErrorHandling(async () => {
      const { projectId, ...queryInput } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      validateGlanceService(glance)

      // Build query parameters using utility function
      const queryParams = new URLSearchParams()
      applyImageQueryParams(queryParams, queryInput)

      const url = `v2/images?${queryParams.toString()}`
      const response = await glance.get(url)

      if (!response?.ok) {
        throw mapResponseToTRPCError(response, { operation: "list images" })
      }

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
        const { projectId, first, next, ...queryInput } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Build query parameters using utility function
        const queryParams = new URLSearchParams()
        applyImageQueryParams(queryParams, queryInput)

        const url = first || next || `v2/images?${queryParams.toString()}`
        const response = await glance.get(url)

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, { operation: "list images with pagination" })
        }

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
        const { projectId, imageId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}`)

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, { operation: "fetch image", imageId })
        }

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
        const { projectId, ...imageData } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post("v2/images", {
          json: imageData,
        })

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, { operation: "create image" })
        }

        const parsedData = imageDetailResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image")
        }

        return parsedData.data.image
      }, "create image")
    }),

  uploadImage: protectedProcedure.input(uploadImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { projectId, imageId, imageData, contentType } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
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

      const response = await glance.put(`v2/images/${imageId}/file`, {
        body,
        headers: {
          "Content-Type": contentType,
        },
      })

      if (!response?.ok) {
        throw ImageErrorHandlers.upload(response, imageId, contentType)
      }

      return true
    }, "upload image")
  }),

  updateImage: protectedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { projectId, imageId, operations } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.patch(`v2/images/${imageId}`, {
          json: operations,
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, { operation: "update image", imageId })
        }

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
        const { projectId, imageId, visibility } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
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
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
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
        const { projectId, imageId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post(`v2/images/${imageId}/actions/deactivate`, undefined)

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, {
            operation: "deactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        }

        return true
      }, "deactivate image")
    }),

  reactivateImage: protectedProcedure
    .input(reactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { projectId, imageId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post(`v2/images/${imageId}/actions/reactivate`, undefined)

        if (!response?.ok) {
          throw mapResponseToTRPCError(response, {
            operation: "reactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        }

        return true
      }, "reactivate image")
    }),

  listImageMembers: protectedProcedure
    .input(listImageMembersInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember[]> => {
      return withErrorHandling(async () => {
        const { projectId, imageId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
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
        const { projectId, imageId, memberId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
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
        const { projectId, imageId, member } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
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
        const { projectId, imageId, memberId, status } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
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
        const { projectId, imageId, memberId } = input
        const openstackSession = await ctx.rescopeSession({ projectId })
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.del(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.delete(response, imageId, memberId)
        }

        return true
      }, "delete image member")
    }),
}
