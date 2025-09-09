import { protectedProcedure } from "../../trpc"
import { TRPCError } from "@trpc/server"
import { applyImageQueryParams } from "../helpers/imageHelpers"
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
    const { projectId, ...queryInput } = input
    const openstackSession = await ctx.rescopeSession({ projectId })
    const glance = openstackSession?.service("glance")

    if (!glance) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize OpenStack Glance service",
      })
    }

    // Build query parameters using utility function
    const queryParams = new URLSearchParams()
    applyImageQueryParams(queryParams, queryInput)

    const url = `v2/images?${queryParams.toString()}`

    try {
      const response = await glance.get(url)
      if (!response?.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch images: ${response?.statusText}`,
        })
      }

      const parsedData = imageResponseSchema.safeParse(await response.json())
      if (!parsedData.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid response format from OpenStack Glance API",
          cause: parsedData.error,
        })
      }

      return parsedData.data.images
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error fetching images",
        cause: error,
      })
    }
  }),

  listImagesWithPagination: protectedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      const { projectId, first, next, ...queryInput } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      // Build query parameters using utility function
      const queryParams = new URLSearchParams()
      applyImageQueryParams(queryParams, queryInput)

      const url = first || next || `v2/images?${queryParams.toString()}`

      try {
        const response = await glance.get(url)
        if (!response?.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch images with pagination: ${response?.statusText}`,
          })
        }

        const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching images with pagination",
          cause: error,
        })
      }
    }),

  getImageById: protectedProcedure
    .input(getImageByIdInputSchema)
    .query(async ({ input, ctx }): Promise<GlanceImage> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.get(`v2/images/${imageId}`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden to image: ${imageId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch image: ${response?.statusText}`,
          })
        }

        // Parse the single image response directly (not wrapped in a container)
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching image by ID",
          cause: error,
        })
      }
    }),

  createImage: protectedProcedure
    .input(createImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      const { projectId, ...imageData } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.post("v2/images", {
          json: imageData,
        })

        if (!response?.ok) {
          if (response?.status === 400) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid image data provided",
            })
          }
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access forbidden - insufficient permissions to create image",
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create image: ${response?.statusText}`,
          })
        }

        const parsedData = imageDetailResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data.image
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating image",
          cause: error,
        })
      }
    }),

  uploadImage: protectedProcedure.input(uploadImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    const { projectId, imageId, imageData, contentType } = input
    const openstackSession = await ctx.rescopeSession({ projectId })
    const glance = openstackSession?.service("glance")

    if (!glance) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize OpenStack Glance service",
      })
    }

    try {
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
        // Handle image not found case (HTTP 404)
        if (response?.status === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Image not found: ${imageId}`,
          })
        }
        // Handle forbidden access (HTTP 403)
        if (response?.status === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden - cannot upload to image: ${imageId}`,
          })
        }
        // Handle invalid state case (HTTP 409) - image must be in 'queued' state
        if (response?.status === 409) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Image is not in a valid state for upload: ${imageId}`,
          })
        }
        // Handle bad request (HTTP 400) - invalid data or headers
        if (response?.status === 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid upload data for image: ${imageId}`,
          })
        }
        // Handle request entity too large (HTTP 413) - image size exceeds limit
        if (response?.status === 413) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: `Image data too large for upload: ${imageId}`,
          })
        }
        // Handle unsupported media type (HTTP 415) - invalid content type
        if (response?.status === 415) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unsupported content type for image upload: ${contentType}`,
          })
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload image: ${response?.statusText}`,
        })
      }

      // Successfully uploaded (HTTP 204)
      return true
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error uploading image",
        cause: error,
      })
    }
  }),

  updateImage: protectedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      const { projectId, imageId, operations } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        // Use PATCH method with JSON Patch operations according to OpenStack Glance API v2
        const response = await glance.patch(`v2/images/${imageId}`, {
          json: operations, // Send the JSON Patch operations array directly
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - cannot update image: ${imageId}`,
            })
          }
          // Handle invalid state case (HTTP 409) - image might be in wrong state for update
          if (response?.status === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Image is not in a valid state for update: ${imageId}`,
            })
          }
          // Handle validation errors (HTTP 400)
          if (response?.status === 400) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid update data for image: ${imageId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update image: ${response?.statusText}`,
          })
        }

        // Parse the updated image response
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating image",
          cause: error,
        })
      }
    }),

  updateImageVisibility: protectedProcedure
    .input(updateImageVisibilityInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      const { projectId, imageId, visibility } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        // Create a JSON Patch operation to update visibility
        const operations = [
          {
            op: "replace" as const,
            path: "/visibility",
            value: visibility,
          },
        ]

        // Use PATCH method with JSON Patch operations according to OpenStack Glance API v2
        const response = await glance.patch(`v2/images/${imageId}`, {
          json: operations,
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - cannot update image visibility: ${imageId}`,
            })
          }
          // Handle invalid state case (HTTP 409) - image might be in wrong state for update
          if (response?.status === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Image is not in a valid state for visibility update: ${imageId}`,
            })
          }
          // Handle validation errors (HTTP 400)
          if (response?.status === 400) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid visibility value for image: ${visibility}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update image visibility: ${response?.statusText}`,
          })
        }

        // Parse the updated image response
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating image visibility",
          cause: error,
        })
      }
    }),

  deleteImage: protectedProcedure.input(deleteImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    const { projectId, imageId } = input
    const openstackSession = await ctx.rescopeSession({ projectId })
    const glance = openstackSession?.service("glance")

    if (!glance) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize OpenStack Glance service",
      })
    }

    try {
      const response = await glance.del(`v2/images/${imageId}`)

      if (!response?.ok) {
        // Handle protected image case (HTTP 403)
        if (response?.status === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Cannot delete protected image: ${imageId}`,
          })
        }
        // Handle image not found case (HTTP 404)
        if (response?.status === 404) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Image not found: ${imageId}`,
          })
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete image: ${response?.statusText}`,
        })
      }

      // Successfully deleted (HTTP 204)
      return true
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error deleting image",
        cause: error,
      })
    }
  }),

  deactivateImage: protectedProcedure
    .input(deactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.post(`v2/images/${imageId}/actions/deactivate`, undefined)

        if (!response?.ok) {
          // Handle forbidden access (HTTP 403) - typically admin-only operation
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - cannot deactivate image: ${imageId}`,
            })
          }
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle invalid state case (HTTP 409) - image must be active or deactivated
          if (response?.status === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Image is not in a valid state for deactivation: ${imageId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to deactivate image: ${response?.statusText}`,
          })
        }

        // Successfully deactivated (HTTP 204)
        return true
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error deactivating image",
          cause: error,
        })
      }
    }),

  reactivateImage: protectedProcedure
    .input(reactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.post(`v2/images/${imageId}/actions/reactivate`, undefined)

        if (!response?.ok) {
          // Handle forbidden access (HTTP 403) - typically admin-only operation
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - cannot reactivate image: ${imageId}`,
            })
          }
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle invalid state case (HTTP 409) - image must be active or deactivated
          if (response?.status === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Image is not in a valid state for reactivation: ${imageId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to reactivate image: ${response?.statusText}`,
          })
        }

        // Successfully reactivated (HTTP 204)
        return true
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error reactivating image",
          cause: error,
        })
      }
    }),

  listImageMembers: protectedProcedure
    .input(listImageMembersInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember[]> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.get(`v2/images/${imageId}/members`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle forbidden access (HTTP 403) - only shared images have members
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - only shared images have members: ${imageId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch image members: ${response?.statusText}`,
          })
        }

        const parsedData = imageMembersResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data.members
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching image members",
          cause: error,
        })
      }
    }),

  getImageMember: protectedProcedure
    .input(getImageMemberInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember> => {
      const { projectId, imageId, memberId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.get(`v2/images/${imageId}/members/${memberId}`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image or member not found: ${imageId}, ${memberId}`,
            })
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden to image member: ${imageId}, ${memberId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch image member: ${response?.statusText}`,
          })
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching image member",
          cause: error,
        })
      }
    }),

  createImageMember: protectedProcedure
    .input(createImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      const { projectId, imageId, member } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.post(`v2/images/${imageId}/members`, {
          json: { member },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image not found: ${imageId}`,
            })
          }
          // Handle forbidden access (HTTP 403) - must be image owner
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - must be image owner to add members: ${imageId}`,
            })
          }
          // Handle bad request (HTTP 400) - invalid member or image visibility
          if (response?.status === 400) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid request - check image visibility is 'shared' and member ID is valid: ${imageId}`,
            })
          }
          // Handle conflict (HTTP 409) - member already exists
          if (response?.status === 409) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Member already exists for image: ${imageId}, ${member}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create image member: ${response?.statusText}`,
          })
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating image member",
          cause: error,
        })
      }
    }),

  updateImageMember: protectedProcedure
    .input(updateImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      const { projectId, imageId, memberId, status } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.put(`v2/images/${imageId}/members/${memberId}`, {
          json: { status },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image or member not found: ${imageId}, ${memberId}`,
            })
          }
          // Handle forbidden access (HTTP 403) - only the member can update their own status
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - only the member can update their own status: ${imageId}, ${memberId}`,
            })
          }
          // Handle bad request (HTTP 400) - invalid status value
          if (response?.status === 400) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid status value: ${status}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update image member: ${response?.statusText}`,
          })
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response format from OpenStack Glance API",
            cause: parsedData.error,
          })
        }

        return parsedData.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating image member",
          cause: error,
        })
      }
    }),

  deleteImageMember: protectedProcedure
    .input(deleteImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId, memberId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      if (!glance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize OpenStack Glance service",
        })
      }

      try {
        const response = await glance.del(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Image or member not found: ${imageId}, ${memberId}`,
            })
          }
          // Handle forbidden access (HTTP 403) - must be image owner
          if (response?.status === 403) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Access forbidden - must be image owner to delete members: ${imageId}, ${memberId}`,
            })
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete image member: ${response?.statusText}`,
          })
        }

        // Successfully deleted (HTTP 204)
        return true
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error deleting image member",
          cause: error,
        })
      }
    }),
}
