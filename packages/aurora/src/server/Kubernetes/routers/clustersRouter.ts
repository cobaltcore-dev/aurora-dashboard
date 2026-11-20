import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { kubernetesInputSchema, clusterInputSchema } from "../types/common"
import { clusterCreateInputSchema, clusterUpdateInputSchema, clusterReplaceInputSchema } from "../types/cluster"
import { shootListSchema, shootSchema } from "../types/shoot"
import {
  shootsPath,
  shootPath,
  gardenerRequest,
  gardenNamespace,
  resolveGardenerEndpoint,
} from "../helpers/gardenerClient"
import { shootToCluster } from "../helpers/clusterMapper"
import { buildShootForCreate, buildUpdatePatch } from "../helpers/shootBuilder"
import { decodeKubeconfig } from "../helpers/kubeconfig"
import { listCloudProfileVersions } from "./cloudProfilesRouter"

/**
 * Clusters router for Gardener shoots.
 * Each procedure → Gardener request mapping:
 * - list: GET /shoots
 * - getByName: GET /shoots/{name}
 * - create: POST /shoots
 * - update: GET then PATCH /shoots/{name}
 * - replace: PUT /shoots/{name}
 * - reconcile: PATCH /shoots/{name} with reconcile annotation
 * - confirmDeletion: PATCH /shoots/{name} with deletion confirmation
 * - delete: PATCH then DELETE /shoots/{name}
 * - getAdminKubeconfig: POST /shoots/{name}/adminkubeconfig
 *
 * See https://github.com/sapcc/elektra/tree/master/plugins/kubernetes_ng/app/services/service_layer/kubernetes_ng_services
 */
export const clustersRouter = {
  list: projectScopedProcedure.input(kubernetesInputSchema).query(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      // Fetch shoots and cloud profiles in parallel
      const [shootsResponse, versionsByProfile] = await Promise.all([
        gardenerRequest(ctx, input.landscape, {
          method: "GET",
          path: shootsPath,
          schema: shootListSchema,
          operation: "list clusters",
        }),
        listCloudProfileVersions(ctx, input.landscape),
      ])

      if (!shootsResponse) return []

      return shootsResponse.items.map((shoot) =>
        shootToCluster(shoot, {
          versionsByProfile,
          includeRaw: false,
        })
      )
    }, "list clusters")
  ),

  getByName: projectScopedProcedure.input(clusterInputSchema).query(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      // Fetch shoot and cloud profiles in parallel
      const [shootResponse, versionsByProfile] = await Promise.all([
        gardenerRequest(ctx, input.landscape, {
          method: "GET",
          path: (ns) => shootPath(ns, input.name),
          schema: shootSchema,
          operation: "get cluster",
        }),
        listCloudProfileVersions(ctx, input.landscape),
      ])

      if (!shootResponse) {
        // This should not happen since allowNotFound is not set, but handle defensively
        throw new Error("Cluster not found")
      }

      return shootToCluster(shootResponse, {
        versionsByProfile,
        includeRaw: true,
      })
    }, "get cluster")
  ),

  create: projectScopedProcedure.input(clusterCreateInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const { region } = resolveGardenerEndpoint(ctx, input.landscape)
      const body = buildShootForCreate(input, region)

      const shootResponse = await gardenerRequest(ctx, input.landscape, {
        method: "POST",
        path: shootsPath,
        body,
        contentType: "application/json",
        schema: shootSchema,
        operation: "create cluster",
      })

      if (!shootResponse) {
        throw new Error("Failed to create cluster")
      }

      return shootToCluster(shootResponse, {
        includeRaw: false,
      })
    }, "create cluster")
  ),

  update: projectScopedProcedure.input(clusterUpdateInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      // First fetch the current shoot
      const currentShoot = await gardenerRequest(ctx, input.landscape, {
        method: "GET",
        path: (ns) => shootPath(ns, input.name),
        schema: shootSchema,
        operation: "get cluster for update",
      })

      if (!currentShoot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cluster not found" })
      }

      // Build and apply the patch
      const patch = buildUpdatePatch(input, currentShoot)

      const updatedShoot = await gardenerRequest(ctx, input.landscape, {
        method: "PATCH",
        path: (ns) => shootPath(ns, input.name),
        body: patch,
        contentType: "application/merge-patch+json",
        schema: shootSchema,
        operation: "update cluster",
      })

      if (!updatedShoot) {
        throw new Error("Failed to update cluster")
      }

      return shootToCluster(updatedShoot, {
        includeRaw: false,
      })
    }, "update cluster")
  ),

  replace: projectScopedProcedure.input(clusterReplaceInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      // Validate namespace matches the project
      const { region } = resolveGardenerEndpoint(ctx, input.landscape)
      const expectedNs = gardenNamespace(ctx, region)

      if (input.resource.metadata.namespace && input.resource.metadata.namespace !== expectedNs) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The resource does not belong to this project.",
        })
      }

      const updatedShoot = await gardenerRequest(ctx, input.landscape, {
        method: "PUT",
        path: (ns) => shootPath(ns, input.name),
        body: input.resource,
        contentType: "application/json",
        schema: shootSchema,
        operation: "replace cluster",
      })

      if (!updatedShoot) {
        throw new Error("Failed to replace cluster")
      }

      return shootToCluster(updatedShoot, {
        includeRaw: true,
      })
    }, "replace cluster")
  ),

  reconcile: projectScopedProcedure.input(clusterInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const patch = {
        metadata: {
          annotations: {
            "gardener.cloud/operation": "reconcile",
          },
        },
      }

      const updatedShoot = await gardenerRequest(ctx, input.landscape, {
        method: "PATCH",
        path: (ns) => shootPath(ns, input.name),
        body: patch,
        contentType: "application/merge-patch+json",
        schema: shootSchema,
        operation: "reconcile cluster",
      })

      if (!updatedShoot) {
        throw new Error("Failed to reconcile cluster")
      }

      return shootToCluster(updatedShoot, {
        includeRaw: false,
      })
    }, "reconcile cluster")
  ),

  confirmDeletion: projectScopedProcedure.input(clusterInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const patch = {
        metadata: {
          annotations: {
            "confirmation.gardener.cloud/deletion": "true",
          },
        },
      }

      const updatedShoot = await gardenerRequest(ctx, input.landscape, {
        method: "PATCH",
        path: (ns) => shootPath(ns, input.name),
        body: patch,
        contentType: "application/merge-patch+json",
        schema: shootSchema,
        operation: "confirm deletion",
      })

      if (!updatedShoot) {
        throw new Error("Failed to confirm deletion")
      }

      return shootToCluster(updatedShoot, {
        includeRaw: false,
      })
    }, "confirm deletion")
  ),

  delete: projectScopedProcedure.input(clusterInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      // First, confirm deletion with the annotation
      const patch = {
        metadata: {
          annotations: {
            "confirmation.gardener.cloud/deletion": "true",
          },
        },
      }

      await gardenerRequest(ctx, input.landscape, {
        method: "PATCH",
        path: (ns) => shootPath(ns, input.name),
        body: patch,
        contentType: "application/merge-patch+json",
        schema: shootSchema,
        operation: "confirm deletion",
      })

      // Then delete
      await gardenerRequest(ctx, input.landscape, {
        method: "DELETE",
        path: (ns) => shootPath(ns, input.name),
        schema: z.unknown(), // DELETE may return Shoot or Status Success
        operation: "delete cluster",
      })

      return true
    }, "delete cluster")
  ),

  /**
   * Retrieves the admin kubeconfig for a cluster.
   * This is a mutation because it creates a credential (8-hour expiry).
   *
   * Intentional exception: returns the user's project-scoped Keystone token (as `<region>:<token>`)
   * so kubectl can reach the garden cluster; parity with Elektra (D2). Never log this value.
   */
  getAdminKubeconfig: projectScopedProcedure.input(clusterInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const expirationSeconds = 28800 // 8 hours, as in Elektra

      const response = await gardenerRequest(ctx, input.landscape, {
        method: "POST",
        path: (ns) => shootPath(ns, input.name, "adminkubeconfig"),
        body: {
          apiVersion: "authentication.gardener.cloud/v1alpha1",
          kind: "AdminKubeconfigRequest",
          spec: {
            expirationSeconds,
          },
        },
        contentType: "application/json",
        schema: z
          .object({
            status: z
              .object({
                kubeconfig: z.string(),
              })
              .passthrough(),
          })
          .passthrough(),
        operation: "get admin kubeconfig",
      })

      if (!response) {
        throw new Error("Failed to get admin kubeconfig")
      }

      const kubeconfig = decodeKubeconfig(response.status.kubeconfig)

      return {
        kubeconfig,
        expiresInSeconds: expirationSeconds,
      }
    }, "get admin kubeconfig")
  ),
}
