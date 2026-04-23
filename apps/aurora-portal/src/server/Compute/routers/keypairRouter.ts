import { z } from "zod"
import { projectScopedProcedure } from "../../trpc"
import { keypairsResponseSchema, Keypair } from "../types/keypair"

export const keypairRouter = {
  getKeypairsByProjectId: projectScopedProcedure
    .input(z.object({ project_id: z.string() }))
    .query(async ({ ctx }): Promise<Keypair[] | undefined> => {
      // ctx.openstack is already rescoped to the project by projectScopedProcedure
      const compute = ctx.openstack?.service("compute")

      const parsedData = keypairsResponseSchema.safeParse(await compute?.get("os-keypairs").then((res) => res.json()))
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      // Extract the keypair objects from the nested structure
      return parsedData.data.keypairs.map((item) => item.keypair)
    }),
}
