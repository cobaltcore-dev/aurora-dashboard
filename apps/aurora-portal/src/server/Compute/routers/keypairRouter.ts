import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { keypairsResponseSchema, Keypair } from "../types/keypair"

export const keypairRouter = {
  getKeypairsByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<Keypair[] | undefined> => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
      const compute = openstackSession?.service("compute")

      const parsedData = keypairsResponseSchema.safeParse(await compute?.get("os-keypairs").then((res) => res.json()))
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      // Extract the keypair objects from the nested structure
      return parsedData.data.keypairs.map((item) => item.keypair)
    }),
}
