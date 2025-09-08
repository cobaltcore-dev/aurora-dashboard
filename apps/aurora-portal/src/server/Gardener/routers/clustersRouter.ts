import { protectedProcedure } from "../../trpc"
import { shootApiResponseSchema, shootListApiResponseSchema } from "../types/shootApiSchema"
import { Cluster, convertShootApiResponseToCluster, convertShootListApiSchemaToClusters } from "../types/cluster"
import { getGardenerClient } from "../gardenerClient"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

export const clustersRouter = {
  getClustersByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
      const client = getGardenerClient(openstackSession)
      if (!client) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Gardener client is not available. Please check service catalog.",
        })
      }

      const namespace = `garden-${input.projectId}`

      const parsedData = shootListApiResponseSchema.safeParse(
        await client!.get(`apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots`).then((response) => {
          if (!response.ok)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch clusters: ${response.statusText} (${response.status})`,
            })
          return response.json()
        })
      )

      const clusters = convertShootListApiSchemaToClusters(parsedData.data?.items || [])
      return clusters
    }),

  getClusterByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input, ctx }): Promise<Cluster | undefined> => {
      const openstackSession = await ctx.openstack
      const token = openstackSession?.getToken()

      const client = getGardenerClient(openstackSession)

      if (!client) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Gardener client is not available. Please check service catalog.",
        })
      }

      const namespace = `garden-${token?.tokenData?.project?.id}`

      const parsedData = shootApiResponseSchema.safeParse(
        await client!
          .get(`apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots/${input.name}`)
          .then((res) => res.json())
      )

      if (!parsedData.success) {
        return undefined
      }
      const cluster = convertShootApiResponseToCluster(parsedData.data)
      return cluster
    }),

  deleteCluster: protectedProcedure.input(z.object({ name: z.string() })).mutation(async ({ input, ctx }) => {
    const openstackSession = await ctx.openstack
    const token = openstackSession?.getToken()

    const client = getGardenerClient(openstackSession)
    if (!client) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Gardener client is not available. Please check service catalog.",
      })
    }

    const namespace = `garden-${token?.tokenData?.project?.id}`
    const clusterName = input.name

    // Step 1: Add the deletion confirmation annotation
    await client!
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
      .then((res) => {
        if (!res.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to add deletion confirmation: ${res.statusText} (${res.status})`,
          })
        }
        return res.json()
      })

    // Step 2: Delete the cluster
    const parsedData = shootApiResponseSchema.safeParse(
      await client!
        .del(`apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots/${clusterName}`)
        .then((res) => {
          if (!res.ok)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to delete cluster: ${res.statusText} (${res.status})`,
            })
          return res.json()
        })
    )

    if (!parsedData.success) {
      return undefined
    }

    return convertShootApiResponseToCluster(parsedData.data)
  }),

  createCluster: protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
      const openstackSession = await ctx.openstack
      const token = openstackSession?.getToken()

      const client = getGardenerClient(openstackSession)

      if (!client) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Gardener client is not available. Please check service catalog.",
        })
      }

      const namespace = `garden-${token?.tokenData?.project?.id}`

      // Construct the shoot object from the input
      const shoot = {
        metadata: {
          name: input.name,
          namespace,
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

      const response = await client!
        .post(`apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/shoots`, shoot)
        .then((res) => {
          if (!res.ok) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to create cluster" })
          }
          return res.json()
        })

      // Parse and validate the response
      const parsedData = shootApiResponseSchema.safeParse(response)

      if (!parsedData.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse the API response",
        })
      }

      // Convert to cluster format if needed
      return convertShootApiResponseToCluster(parsedData.data)
    }),
}
