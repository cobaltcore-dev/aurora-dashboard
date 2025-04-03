import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { imageResponseSchema, GlanceImage } from "../types/image"

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
}
