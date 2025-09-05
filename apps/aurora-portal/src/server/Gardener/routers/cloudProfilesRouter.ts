import { protectedProcedure } from "../../trpc"
import { cloudProfileListApiResponseSchema } from "../types/cloudProfileApiSchema"
import { CloudProfile, convertCloudProfileListApiResponseToCloudProfiles } from "../types/cloudProfile"
import { getGardenerClient } from "../gardenerClient"
import { TRPCError } from "@trpc/server"

export const cloudProfilesRouter = {
  getCloudProfiles: protectedProcedure.query(async ({ ctx }): Promise<CloudProfile[]> => {
    const openstackSession = await ctx.openstack
    const client = getGardenerClient(openstackSession)
    if (!client) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Gardener client is not available. Please check service catalog.",
      })
    }

    const parsedData = cloudProfileListApiResponseSchema.safeParse(
      await client!.get("apis/core.gardener.cloud/v1beta1/cloudprofiles").then((r) => {
        if (!r.ok)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch permissions: ${r.statusText} (${r.status})`,
          })
        return r.json()
      })
    )

    const cloudProfiles = convertCloudProfileListApiResponseToCloudProfiles(parsedData.data?.items || [])
    return cloudProfiles
  }),
}
