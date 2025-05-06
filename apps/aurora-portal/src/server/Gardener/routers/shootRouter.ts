import { publicProcedure } from "../../trpc"
import { shootListSchema, shootItemSchema } from "../types/shoot"
import { Cluster, convertShootListToClusters, convertShootToCluster } from "../types/cluster"
import { client } from "../client"
import { z } from "zod"

export const shootRouter = {
  getClusters: publicProcedure.query(async (): Promise<Cluster[]> => {
    const shootList = shootListSchema.safeParse(
      await client
        .get(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`)
        .catch((err) => {
          console.error("Error fetching shoots:", err.message)
          return undefined
        })
    )

    if (!shootList.data) return []
    const clusters = convertShootListToClusters(shootList.data.items)

    return clusters
  }),

  getCluster: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }): Promise<Cluster | undefined> => {
      const shoot = shootItemSchema.safeParse(
        await client
          .get(
            `apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots/${input.name}`
          )
          .catch((err) => {
            console.error("Error fetching shoot:", err.message)
            return undefined
          })
      )

      if (!shoot.data) return undefined
      const cluster = convertShootToCluster(shoot.data)

      return cluster
    }),

  // createCluster: publicProcedure
  //   .input(z.object({ name: z.string(), region: z.string() }))
  //   .mutation(async ({ input }) => {}),
}
