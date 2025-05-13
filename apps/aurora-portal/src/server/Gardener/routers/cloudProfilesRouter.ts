import { publicProcedure } from "../../trpc"
import { cloudProfileListApiResponseSchema } from "../types/cloudProfileApiSchema"
import { CloudProfile, convertCloudProfileListApiResponseToCloudProfiles } from "../types/cloudProfile"
import { client } from "../client"

export const cloudProfilesRouter = {
  getCloudProfiles: publicProcedure.query(async (): Promise<CloudProfile[]> => {
    console.log("::::::::::::::::::::::::::::::::::::::::::::::::")
    const parsedData = cloudProfileListApiResponseSchema.safeParse(
      await client.get("apis/core.gardener.cloud/v1beta1/cloudprofiles").catch(async (err) => {
        const errorBody = await err.response.json()
        const errorDetails = errorBody.error || errorBody.message || err.message
        throw new Error(`Error fetching cloud profiles: ${errorDetails}`)
      })
    )

    console.log("====================================Parsed Data:", parsedData.data?.items.length)

    const cloudProfiles = convertCloudProfileListApiResponseToCloudProfiles(parsedData.data?.items || [])
    return cloudProfiles
  }),
}
