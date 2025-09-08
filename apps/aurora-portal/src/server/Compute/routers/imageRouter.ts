import { protectedProcedure } from "../../trpc"
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
  listImages: protectedProcedure
    .input(listImagesInputSchema)
    .query(async ({ input, ctx }): Promise<GlanceImage[] | undefined> => {
      const { projectId, ...queryInput } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      // Build query parameters using utility function
      const queryParams = new URLSearchParams()
      applyImageQueryParams(queryParams, queryInput)

      const url = `v2/images?${queryParams.toString()}`

      try {
        const response = await glance?.get(url)
        if (!response?.ok) {
          console.error("Failed to fetch images:", response?.statusText)
          return undefined
        }

        const parsedData = imageResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data.images
      } catch (error) {
        console.error("Error fetching images:", error)
        return undefined
      }
    }),

  listImagesWithPagination: protectedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse | undefined> => {
      const { projectId, first, next, ...queryInput } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      // Build query parameters using utility function
      const queryParams = new URLSearchParams()
      applyImageQueryParams(queryParams, queryInput)

      const url = first || next || `v2/images?${queryParams.toString()}`

      try {
        const response = await glance?.get(url)
        if (!response?.ok) {
          console.error("Failed to fetch images with pagination:", response?.statusText)
          return undefined
        }

        const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error fetching images with pagination:", error)
        return undefined
      }
    }),

  getImageById: protectedProcedure
    .input(getImageByIdInputSchema)
    .query(async ({ input, ctx }): Promise<GlanceImage | undefined> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.get(`v2/images/${imageId}`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return undefined
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            console.error("Access forbidden to image:", imageId)
            return undefined
          }
          console.error("Failed to fetch image:", response?.statusText)
          return undefined
        }

        // Parse the single image response directly (not wrapped in a container)
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error fetching image by ID:", error)
        return undefined
      }
    }),

  createImage: protectedProcedure
    .input(createImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage | undefined> => {
      const { projectId, ...imageData } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.post("v2/images", {
          json: imageData,
        })

        if (!response?.ok) {
          console.error("Failed to create image:", response?.statusText)
          return undefined
        }

        const parsedData = imageDetailResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data.image
      } catch (error) {
        console.error("Error creating image:", error)
        return undefined
      }
    }),

  uploadImage: protectedProcedure.input(uploadImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    const { projectId, imageId, imageData, contentType } = input
    const openstackSession = await ctx.rescopeSession({ projectId })
    const glance = openstackSession?.service("glance")

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

      const response = await glance?.put(`v2/images/${imageId}/file`, {
        body,
        headers: {
          "Content-Type": contentType,
        },
      })

      if (!response?.ok) {
        // Handle image not found case (HTTP 404)
        if (response?.status === 404) {
          console.error("Image not found:", imageId)
          return false
        }
        // Handle forbidden access (HTTP 403)
        if (response?.status === 403) {
          console.error("Access forbidden - cannot upload to image:", imageId)
          return false
        }
        // Handle invalid state case (HTTP 409) - image must be in 'queued' state
        if (response?.status === 409) {
          console.error("Image is not in a valid state for upload:", imageId)
          return false
        }
        // Handle bad request (HTTP 400) - invalid data or headers
        if (response?.status === 400) {
          console.error("Invalid upload data for image:", imageId, response?.statusText)
          return false
        }
        // Handle request entity too large (HTTP 413) - image size exceeds limit
        if (response?.status === 413) {
          console.error("Image data too large for upload:", imageId)
          return false
        }
        // Handle unsupported media type (HTTP 415) - invalid content type
        if (response?.status === 415) {
          console.error("Unsupported content type for image upload:", imageId, contentType)
          return false
        }
        console.error("Failed to upload image:", response?.statusText)
        return false
      }

      // Successfully uploaded (HTTP 204)
      return true
    } catch (error) {
      console.error("Error uploading image:", error)
      return false
    }
  }),

  updateImage: protectedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage | undefined> => {
      const { projectId, imageId, operations } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        // Use PATCH method with JSON Patch operations according to OpenStack Glance API v2
        const response = await glance?.patch(`v2/images/${imageId}`, {
          json: operations, // Send the JSON Patch operations array directly
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return undefined
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            console.error("Access forbidden - cannot update image:", imageId)
            return undefined
          }
          // Handle invalid state case (HTTP 409) - image might be in wrong state for update
          if (response?.status === 409) {
            console.error("Image is not in a valid state for update:", imageId)
            return undefined
          }
          // Handle validation errors (HTTP 400)
          if (response?.status === 400) {
            console.error("Invalid update data for image:", imageId, response?.statusText)
            return undefined
          }
          console.error("Failed to update image:", response?.statusText)
          return undefined
        }

        // Parse the updated image response
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error updating image:", error)
        return undefined
      }
    }),

  updateImageVisibility: protectedProcedure
    .input(updateImageVisibilityInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage | undefined> => {
      const { projectId, imageId, visibility } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

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
        const response = await glance?.patch(`v2/images/${imageId}`, {
          json: operations,
          headers: {
            "Content-Type": "application/openstack-images-v2.1-json-patch",
          },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return undefined
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            console.error("Access forbidden - cannot update image visibility:", imageId)
            return undefined
          }
          // Handle invalid state case (HTTP 409) - image might be in wrong state for update
          if (response?.status === 409) {
            console.error("Image is not in a valid state for visibility update:", imageId)
            return undefined
          }
          // Handle validation errors (HTTP 400)
          if (response?.status === 400) {
            console.error("Invalid visibility value for image:", imageId, visibility, response?.statusText)
            return undefined
          }
          console.error("Failed to update image visibility:", response?.statusText)
          return undefined
        }

        // Parse the updated image response
        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error updating image visibility:", error)
        return undefined
      }
    }),

  deleteImage: protectedProcedure.input(deleteImageInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    const { projectId, imageId } = input
    const openstackSession = await ctx.rescopeSession({ projectId })
    const glance = openstackSession?.service("glance")

    try {
      const response = await glance?.del(`v2/images/${imageId}`)

      if (!response?.ok) {
        // Handle protected image case (HTTP 403)
        if (response?.status === 403) {
          console.error("Cannot delete protected image:", imageId)
          return false
        }
        // Handle image not found case (HTTP 404)
        if (response?.status === 404) {
          console.error("Image not found:", imageId)
          return false
        }
        console.error("Failed to delete image:", response?.statusText)
        return false
      }

      // Successfully deleted (HTTP 204)
      return true
    } catch (error) {
      console.error("Error deleting image:", error)
      return false
    }
  }),

  deactivateImage: protectedProcedure
    .input(deactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.post(`v2/images/${imageId}/actions/deactivate`, undefined)

        if (!response?.ok) {
          // Handle forbidden access (HTTP 403) - typically admin-only operation
          if (response?.status === 403) {
            console.error("Access forbidden - cannot deactivate image:", imageId)
            return false
          }
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return false
          }
          // Handle invalid state case (HTTP 409) - image must be active or deactivated
          if (response?.status === 409) {
            console.error("Image is not in a valid state for deactivation:", imageId)
            return false
          }
          console.error("Failed to deactivate image:", response?.statusText)
          return false
        }

        // Successfully deactivated (HTTP 204)
        return true
      } catch (error) {
        console.error("Error deactivating image:", error)
        return false
      }
    }),

  reactivateImage: protectedProcedure
    .input(reactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.post(`v2/images/${imageId}/actions/reactivate`, undefined)

        if (!response?.ok) {
          // Handle forbidden access (HTTP 403) - typically admin-only operation
          if (response?.status === 403) {
            console.error("Access forbidden - cannot reactivate image:", imageId)
            return false
          }
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return false
          }
          // Handle invalid state case (HTTP 409) - image must be active or deactivated
          if (response?.status === 409) {
            console.error("Image is not in a valid state for reactivation:", imageId)
            return false
          }
          console.error("Failed to reactivate image:", response?.statusText)
          return false
        }

        // Successfully reactivated (HTTP 204)
        return true
      } catch (error) {
        console.error("Error reactivating image:", error)
        return false
      }
    }),

  listImageMembers: protectedProcedure
    .input(listImageMembersInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember[] | undefined> => {
      const { projectId, imageId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.get(`v2/images/${imageId}/members`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return undefined
          }
          // Handle forbidden access (HTTP 403) - only shared images have members
          if (response?.status === 403) {
            console.error("Access forbidden - only shared images have members:", imageId)
            return undefined
          }
          console.error("Failed to fetch image members:", response?.statusText)
          return undefined
        }

        const parsedData = imageMembersResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data.members
      } catch (error) {
        console.error("Error fetching image members:", error)
        return undefined
      }
    }),

  getImageMember: protectedProcedure
    .input(getImageMemberInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember | undefined> => {
      const { projectId, imageId, memberId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.get(`v2/images/${imageId}/members/${memberId}`)
        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image or member not found:", imageId, memberId)
            return undefined
          }
          // Handle forbidden access (HTTP 403)
          if (response?.status === 403) {
            console.error("Access forbidden to image member:", imageId, memberId)
            return undefined
          }
          console.error("Failed to fetch image member:", response?.statusText)
          return undefined
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error fetching image member:", error)
        return undefined
      }
    }),

  createImageMember: protectedProcedure
    .input(createImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember | undefined> => {
      const { projectId, imageId, member } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.post(`v2/images/${imageId}/members`, {
          json: { member },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image not found:", imageId)
            return undefined
          }
          // Handle forbidden access (HTTP 403) - must be image owner
          if (response?.status === 403) {
            console.error("Access forbidden - must be image owner to add members:", imageId)
            return undefined
          }
          // Handle bad request (HTTP 400) - invalid member or image visibility
          if (response?.status === 400) {
            console.error(
              "Invalid request - check image visibility is 'shared' and member ID is valid:",
              imageId,
              member
            )
            return undefined
          }
          // Handle conflict (HTTP 409) - member already exists
          if (response?.status === 409) {
            console.error("Member already exists for image:", imageId, member)
            return undefined
          }
          console.error("Failed to create image member:", response?.statusText)
          return undefined
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error creating image member:", error)
        return undefined
      }
    }),

  updateImageMember: protectedProcedure
    .input(updateImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember | undefined> => {
      const { projectId, imageId, memberId, status } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.put(`v2/images/${imageId}/members/${memberId}`, {
          json: { status },
        })

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image or member not found:", imageId, memberId)
            return undefined
          }
          // Handle forbidden access (HTTP 403) - only the member can update their own status
          if (response?.status === 403) {
            console.error("Access forbidden - only the member can update their own status:", imageId, memberId)
            return undefined
          }
          // Handle bad request (HTTP 400) - invalid status value
          if (response?.status === 400) {
            console.error("Invalid status value:", imageId, memberId, status)
            return undefined
          }
          console.error("Failed to update image member:", response?.statusText)
          return undefined
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          return undefined
        }

        return parsedData.data
      } catch (error) {
        console.error("Error updating image member:", error)
        return undefined
      }
    }),

  deleteImageMember: protectedProcedure
    .input(deleteImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      const { projectId, imageId, memberId } = input
      const openstackSession = await ctx.rescopeSession({ projectId })
      const glance = openstackSession?.service("glance")

      try {
        const response = await glance?.del(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          // Handle image not found case (HTTP 404)
          if (response?.status === 404) {
            console.error("Image or member not found:", imageId, memberId)
            return false
          }
          // Handle forbidden access (HTTP 403) - must be image owner
          if (response?.status === 403) {
            console.error("Access forbidden - must be image owner to delete members:", imageId, memberId)
            return false
          }
          console.error("Failed to delete image member:", response?.statusText)
          return false
        }

        // Successfully deleted (HTTP 204)
        return true
      } catch (error) {
        console.error("Error deleting image member:", error)
        return false
      }
    }),
}
