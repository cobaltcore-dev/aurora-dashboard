import { protectedProcedure } from "../../trpc"
import { applyImageQueryParams } from "../helpers/imageHelpers"
import {
  imageResponseSchema,
  imageSchema,
  GlanceImage,
  createImageInputSchema,
  imageDetailResponseSchema,
  deleteImageInputSchema,
  listImagesInputSchema,
  imagesPaginatedResponseSchema,
  ImagesPaginatedResponse,
  imagesPaginatedInputSchema,
  getImageByIdInputSchema,
  deactivateImageInputSchema,
  reactivateImageInputSchema,
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
}
