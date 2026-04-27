import { z } from "zod"
import { projectScopedProcedure } from "../../trpc"
import { serverGroupsResponseSchema, ServerGroup } from "../types/serverGroup"

export const serverGroupRouter = {
  getServerGroupsByProjectId: projectScopedProcedure
    .input(z.object({ project_id: z.string() }))
    .query(async ({ ctx }): Promise<ServerGroup[] | undefined> => {
      // ctx.openstack is already rescoped to the project by projectScopedProcedure
      const compute = ctx.openstack?.service("compute")

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
