import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { imageResponseSchema, GlanceImage, createImageInputSchema, imageDetailResponseSchema } from "../types/image"

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
}
