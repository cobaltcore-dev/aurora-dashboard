import { publicProcedure } from "./trpc"
import { shootApiResponseSchema, shootListApiResponseSchema } from "../types/shootApiSchema"
import { Cluster, convertShootApiResponseToCluster, convertShootListApiSchemaToClusters } from "../types/cluster"
import { K8sClient } from "../k8sClient"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

export const clustersRouter = (apiClient: K8sClient) => ({
  getClusters: publicProcedure.query(async () => {
    const parsedData = shootListApiResponseSchema.safeParse(
      await apiClient
        .get(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`)
        .catch(async (err) => {
          const errorBody = await err?.response?.json()
          const errorDetails = errorBody?.error || errorBody?.message || err.message
          throw new Error(`Error fetching clusters: ${errorDetails}`)
        })
    )

    console.log("Parsed Data:", parsedData?.error)
    const clusters = convertShootListApiSchemaToClusters(parsedData.data?.items || [])
    return clusters
  }),

  getClusterByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }): Promise<Cluster | undefined> => {
      const parsedData = shootApiResponseSchema.safeParse(
        await apiClient.get(
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
      await apiClient
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
        await apiClient
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
          type: z.string().default("openstack"), // e.g., "openstack", "aws", etc.
          // Provider-specific options
          loadBalancerProvider: z.string().default("f5"), // e.g., "f5", "aws", etc.
          floatingPoolName: z.string(),
        }),

        // Networking settings
        networking: z.object({
          type: z.string().default("calico"),
          pods: z.string(),
          nodes: z.string(),
          services: z.string(),
        }),

        // Worker configuration
        workers: z
          .array(
            z.object({
              name: z.string().default("containerd"),
              machineType: z.string(),
              machineImage: z.object({
                name: z.string(),
                version: z.string(),
              }),
              minimum: z.number().int().min(1),
              maximum: z.number().int().min(1),
              zones: z.array(z.string()),
            })
          )
          .min(1),

        // Optional advanced settings
        secretBindingName: z.string().optional(),
        credentialsBindingName: z.string().optional(),
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
            workers: input.workers.map((worker) => ({
              name: worker.name,
              machine: {
                type: worker.machineType,
                image: {
                  name: worker.machineImage.name,
                  version: worker.machineImage.version,
                },
                architecture: "amd64", // Could make this configurable if needed
              },
              minimum: worker.minimum,
              maximum: worker.maximum,
              maxSurge: 1, // Could make this configurable if needed
              maxUnavailable: 0, // Could make this configurable if needed
              zones: worker.zones,
              cri: {
                name: "containerd", // Could make this configurable if needed
              },
              systemComponents: {
                allow: true,
              },
              updateStrategy: input.updateStrategy,
            })),
          },
          cloudProfileName: input.cloudProfileName,
          secretBindingName: input.secretBindingName, // Default value if not provided
          credentialsBindingName: input.credentialsBindingName, // Default value if not provided
          region: input.region,
        },
      }

      const response = await apiClient
        .post(`apis/core.gardener.cloud/v1beta1/namespaces/garden-${process.env.GARDENER_PROJECT}/shoots`, shoot)
        .catch(async (err) => {
          const errorBody = (await err.response?.json()) || {}
          const errorDetails = errorBody.error || errorBody.message || err.message
          throw new Error(`Error creating cluster: ${errorDetails}`)
        })

      // Parse and validate the response
      const parsedData = shootApiResponseSchema.safeParse(response)

      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse the API response",
        })
      }

      // Convert to cluster format if needed
      return convertShootApiResponseToCluster(parsedData.data)
    }),
})
