import { publicProcedure } from "../../trpc"
import { shootApiResponseSchema, shootListApiResponseSchema } from "../types/shootApiSchema"
import { Cluster, convertShootApiResponseToCluster, convertShootListApiSchemaToClusters } from "../types/cluster"
import { client } from "../client"
import { AuroraTRPCError } from "@cobaltcore-dev/aurora-sdk"
import { z } from "zod"

export const shootRouter = {
  getClusters: publicProcedure.query(async (): Promise<Cluster[]> => {
    const parsedData = shootListApiResponseSchema.safeParse(
      await client
        .get(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`)
        .catch(async (err) => {
          const errorBody = await err.response.json()
          const errorDetails = errorBody.error || errorBody.message || err.message
          throw new Error(`Error fetching clusters: ${errorDetails}`)
        })
    )

    console.log("Parsed Data:", parsedData.error)
    const clusters = convertShootListApiSchemaToClusters(parsedData.data?.items || [])
    return clusters
  }),

  getClusterByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }): Promise<Cluster | undefined> => {
      const parsedData = shootApiResponseSchema.safeParse(
        await client.get(
          `apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots/${input.name}`
        )
      )

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      const cluster = convertShootApiResponseToCluster(parsedData.data)
      return cluster
    }),
  deleteCluster: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
    const namespace = `garden-${process.env.GARDENER_PROJECT}`
    const clusterName = input.name

    try {
      // Step 1: Add the deletion confirmation annotation
      await client
        .patch(
          `apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots/${clusterName}`,
          [
            {
              op: "add",
              path: "/metadata/annotations/confirmation.gardener.cloud~1deletion",
              value: "true",
            },
          ],
          {
            headers: {
              "Content-Type": "application/json-patch+json",
            },
          }
        )
        .catch(async (err) => {
          const errorBody = (await err.response?.json()) || {}
          const errorDetails = errorBody.error || errorBody.message || err.message
          throw new Error(`Error adding deletion confirmation: ${errorDetails}`)
        })

      // Step 2: Delete the cluster
      const parsedData = shootApiResponseSchema.safeParse(
        await client
          .delete(`apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots/${clusterName}`)
          .catch(async (err) => {
            const errorBody = (await err.response?.json()) || {}
            const errorDetails = errorBody.error || errorBody.message || err.message
            throw new Error(`Error deleting cluster: ${errorDetails}`)
          })
      )

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      return convertShootApiResponseToCluster(parsedData.data)
    } catch (error) {
      console.error("Error in deleteCluster:", error)
      throw error
    }
  }),

  createCluster: publicProcedure
    .input(
      z.object({
        // Basic cluster settings
        name: z.string(),
        region: z.string(),
        kubernetesVersion: z.string(),

        // Infrastructure settings
        cloudProfileName: z.string(),
        infrastructure: z.object({
          type: z.string(), // e.g., "openstack", "aws", etc.
          // Provider-specific options
          loadBalancerProvider: z.string().optional(),
          floatingPoolName: z.string().optional(),
        }),

        // Networking settings
        networking: z.object({
          type: z.string().default("calico"),
          pods: z.string(),
          nodes: z.string(),
          services: z.string(),
        }),

        // Worker configuration
        worker: z.object({
          name: z.string(),
          machineType: z.string(),
          machineImage: z.object({
            name: z.string(),
            version: z.string(),
          }),
          minimum: z.number().int().min(1),
          maximum: z.number().int().min(1),
          zones: z.array(z.string()),
        }),

        // Optional advanced settings
        secretBindingName: z.string().optional(),
        updateStrategy: z.enum(["RollingUpdate", "AutoRollingUpdate"]).default("AutoRollingUpdate"),
      })
    )
    .mutation(async ({ input }) => {
      // Construct the shoot object from the input
      const shoot = {
        metadata: {
          name: input.name,
          namespace: `garden-${process.env.GARDENER_PROJECT}`,
        },
        spec: {
          kubernetes: {
            version: input.kubernetesVersion,
          },
          networking: {
            type: input.networking.type,
            pods: input.networking.pods,
            nodes: input.networking.nodes,
            services: input.networking.services,
            ipFamilies: ["IPv4"], // Could make this configurable if needed
          },
          provider: {
            type: input.infrastructure.type,
            controlPlaneConfig: {
              apiVersion: `${input.infrastructure.type}.provider.extensions.gardener.cloud/v1alpha1`,
              kind: "ControlPlaneConfig",
              loadBalancerProvider: input.infrastructure.loadBalancerProvider,
            },
            infrastructureConfig: {
              apiVersion: `${input.infrastructure.type}.provider.extensions.gardener.cloud/v1alpha1`,
              kind: "InfrastructureConfig",
              networks: {
                workers: input.networking.nodes,
              },
              ...(input.infrastructure.floatingPoolName && { floatingPoolName: input.infrastructure.floatingPoolName }),
            },
            workers: [
              {
                name: input.worker.name,
                machine: {
                  type: input.worker.machineType,
                  image: {
                    name: input.worker.machineImage.name,
                    version: input.worker.machineImage.version,
                  },
                  architecture: "amd64", // Could make this configurable if needed
                },
                minimum: input.worker.minimum,
                maximum: input.worker.maximum,
                maxSurge: 1, // Could make this configurable if needed
                maxUnavailable: 0, // Could make this configurable if needed
                zones: input.worker.zones,
                cri: {
                  name: "containerd", // Could make this configurable if needed
                },
                systemComponents: {
                  allow: true,
                },
                updateStrategy: input.updateStrategy,
              },
            ],
          },
          cloudProfileName: input.cloudProfileName,
          secretBindingName: input.secretBindingName, // Default value if not provided
          region: input.region,
        },
      }

      try {
        const response = await client.post(
          `apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`,
          shoot
        )

        // Parse and validate the response
        const parsedData = shootApiResponseSchema.safeParse(response)

        if (!parsedData.success) {
          console.error("Zod Parsing Error:", parsedData.error.format())
          throw new AuroraTRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse the API response",
          })
        }

        // Convert to cluster format if needed
        return convertShootApiResponseToCluster(parsedData.data)
      } catch (error) {
        console.error("Error creating cluster:", error)
        return undefined
      }
    }),
}
