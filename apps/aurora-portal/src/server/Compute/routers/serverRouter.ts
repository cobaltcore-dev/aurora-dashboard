import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { Server, serverResponseSchema } from "../types/server"

export const serverRouter = {
  getServersByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<Server[] | undefined> => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
      const compute = openstackSession?.service("compute")

      const parsedData = serverResponseSchema.safeParse(await compute?.get("servers/detail").then((res) => res.json()))
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.servers
    }),
}
