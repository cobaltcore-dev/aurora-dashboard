import { publicProcedure } from "../../trpc"
import { CloudProfile, createCloudProfilesFromApiResponse } from "../types/cloudProfile"
import { client } from "../client"

export const cloudProfilesRouter = {
  getCloudProfiles: publicProcedure.query(async (): Promise<CloudProfile[]> => {
    try {
      const response = await client.get("apis/core.gardener.cloud/v1beta1/cloudprofiles")
      return createCloudProfilesFromApiResponse(response)
    } catch (error) {
      console.error("Error fetching cloud profiles:", error)
      return []
    }
  }),
}
