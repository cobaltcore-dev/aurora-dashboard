import { publicProcedure } from "../../trpc"
import { shootItemSchema, shootListSchema } from "../types/shoot"
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
      await client
        .post(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`, {
          metadata: {
            name: input.name,
            namespace: `garden-${process.env.GARDENER_PROJECT}`,
          },
          spec: {
            // Add your cluster spec here
            kubernetes: {
              version: "1.31.7",
            },
            networking: {
              type: "calico", // Common networking provider
              pods: "100.64.0.0/12",
              nodes: "10.180.0.0/16",
              services: "100.104.0.0/13",
              ipFamilies: ["IPv4"],
            },
            provider: {
              type: "openstack",
              controlPlaneConfig: {
                apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
                kind: "ControlPlaneConfig",
                loadBalancerProvider: "f5",
              },
              infrastructureConfig: {
                apiVersion: "openstack.provider.extensions.gardener.cloud/v1alpha1",
                kind: "InfrastructureConfig",
                networks: {
                  workers: "10.180.0.0/16",
                },
                floatingPoolName: "FloatingIPap",
              },

              workers: [
                {
                  name: "worker-test",
                  machine: {
                    type: "g_c2_m4",
                    image: {
                      name: "gardenlinux",
                      version: "1592.9.0",
                    },
                    architecture: "amd64",
                  },
                  minimum: 1,
                  maximum: 2,
                  maxSurge: 1,
                  maxUnavailable: 0,
                  zones: ["eu-de-1d"],
                  cri: {
                    name: "containerd",
                  },
                  systemComponents: {
                    allow: true,
                  },
                  updateStrategy: "AutoRollingUpdate",
                },
              ],
            },
            cloudProfileName: "converged-cloud",
            secretBindingName: "my-openstack-secret",
            region: "eu-de-1",
          },
        })
        .catch(async (err) => {
          const errorDetails = await err.response.json()
          throw new Error(errorDetails.message)
        })
    )
    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }

    return parsedData.data
  }),
}
