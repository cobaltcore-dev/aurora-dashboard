import { publicProcedure } from "../../trpc"
import { CloudProfile, cloudProfileListSchema } from "../types/cloudProfile"
import { client } from "../client"

export const cloudProfilesRouter = {
  getCloudProfiles: publicProcedure.query(async (): Promise<CloudProfile[]> => {
    const parsedData = cloudProfileListSchema.safeParse(
      await client
        .get(`apis/gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/cloudprofiles`)
        .catch(async (err) => {
          const errorBody = await err.response.json()
          const errorDetails = errorBody.error || errorBody.message || err.message
          throw new Error(`Error fetching cloud profiles: ${errorDetails}`)
        })
    )
    const cloudProfiles = parsedData.data?.items || []
    return cloudProfiles
  }),
}
