import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { serverGroupsResponseSchema, ServerGroup } from "../types/serverGroup"

export const serverGroupRouter = {
  getServerGroupsByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<ServerGroup[] | undefined> => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
      const compute = openstackSession?.service("compute")

      const parsedData = serverGroupsResponseSchema.safeParse(
        await compute?.get("os-server-groups").then((res) => res.json())
      )

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      return parsedData.data.server_groups
    }),
}
