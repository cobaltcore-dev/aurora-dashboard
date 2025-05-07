import { publicProcedure } from "../../trpc"
import { shootListSchema, shootItemSchema } from "../types/shoot"
import { Cluster, convertShootListToClusters, convertShootToCluster } from "../types/cluster"
import { client } from "../client"
import { z } from "zod"

export const shootRouter = {
  getClusters: publicProcedure.query(async (): Promise<Cluster[]> => {
    const parsedData = shootListSchema.safeParse(
      await client
        .get(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`)
        .catch((err) => {
          console.error("Error fetching shoots:", err.message)
          return undefined
        })
    )

    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return []
    }

    const clusters = convertShootListToClusters(parsedData.data.items)
    return clusters
  }),

  getClusterByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }): Promise<Cluster | undefined> => {
      const parsedData = shootItemSchema.safeParse(
        await client.get(
          `apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots/${input.name}`
        )
      )

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      const cluster = convertShootToCluster(parsedData.data)
      return cluster
    }),

  createCluster: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
    const parsedData = shootItemSchema.safeParse(
      await client.post(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`, {
        apiVersion: "core.gardener.cloud/v1beta1",
        kind: "Shoot",
        metadata: {
          name: input.name,
          namespace: `garden-${process.env.GARDENER_PROJECT}`,
        },
        spec: {
          // Add your cluster spec here
        },
      })
    )
    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }

    return parsedData.data
  }),
}
