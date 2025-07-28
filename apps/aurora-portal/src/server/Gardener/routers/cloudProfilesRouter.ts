import { protectedProcedure } from "../../trpc"
import { cloudProfileListApiResponseSchema } from "../types/cloudProfileApiSchema"
import { CloudProfile, convertCloudProfileListApiResponseToCloudProfiles } from "../types/cloudProfile"
import { getClient } from "../client"

export const cloudProfilesRouter = {
  getCloudProfiles: protectedProcedure.query(async ({ ctx }): Promise<CloudProfile[]> => {
    const token = ctx.openstack?.getToken()
    const client = getClient({ token: token!.authToken })

    const parsedData = cloudProfileListApiResponseSchema.safeParse(
      await client.get("apis/core.gardener.cloud/v1beta1/cloudprofiles").catch(async (err) => {
        const errorBody = await err.response.json()
        const errorDetails = errorBody.error || errorBody.message || err.message
        throw new Error(`Error fetching cloud profiles: ${errorDetails}`)
      })
    )

    const cloudProfiles = convertCloudProfileListApiResponseToCloudProfiles(parsedData.data?.items || [])
    return cloudProfiles
  }),
}
