import { protectedProcedure } from "../../trpc"
import { networkResponseSchema, Network } from "../types/models"
import { z } from "zod"

export const networkRouter = {
  getRoutersByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<Network[] | undefined> => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })

      const identityService = openstackSession?.service("identity")
      const parsedData = networkResponseSchema.safeParse(
        await identityService?.get("projects").then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.networks
    }),
}
