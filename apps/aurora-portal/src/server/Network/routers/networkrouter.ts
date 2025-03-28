import { protectedProcedure } from "../../trpc"
import { networkResponseSchema, Network } from "../types/models"

export const networkRouter = {
  getNetworks: protectedProcedure.query(async ({ ctx }): Promise<Network[] | undefined> => {
    const openstackSession = ctx.openstack

    const identityService = openstackSession?.service("identity")
    const parsedData = networkResponseSchema.safeParse(await identityService?.get("projects").then((res) => res.json()))
    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }
    // return parsedData.data.projects
  }),
}
