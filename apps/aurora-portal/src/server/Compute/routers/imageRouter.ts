import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import {
  imageResponseSchema,
  GlanceImage,
  createImageInputSchema,
  imageDetailResponseSchema,
  deleteImageInputSchema,
} from "../types/image"

export const imageRouter = {
  getImagesByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<GlanceImage[] | undefined> => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
      const glance = openstackSession?.service("glance")

      const parsedData = imageResponseSchema.safeParse(await glance?.get("v2/images").then((res) => res.json()))
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.images
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
}
