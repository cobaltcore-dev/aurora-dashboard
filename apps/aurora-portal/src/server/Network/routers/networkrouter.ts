import { protectedProcedure } from "../../trpc"
import { networksResponseSchema, Network } from "../types/network"

export const networkRouter = {
  getNetworks: protectedProcedure.query(async ({ ctx }): Promise<Network[] | undefined> => {
    const openstackSession = ctx.openstack
    const network = openstackSession?.service("network")

    const parsedData = networksResponseSchema.safeParse(await network?.get("v2.0/networks").then((res) => res.json()))

    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }

    return parsedData.data.networks
  }),
}
