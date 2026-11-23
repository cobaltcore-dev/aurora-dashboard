/* eslint-disable @typescript-eslint/no-explicit-any */
import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { kubernetesInputSchema } from "../types/common"
import { ssarResponseSchema, type KubernetesPermissions } from "../types/permissions"
import { SSAR_PATH, gardenerRequest, gardenNamespace, resolveGardenerEndpoint } from "../helpers/gardenerClient"

/**
 * Checks permissions via SelfSubjectAccessReview.
 * See https://kubernetes.io/docs/reference/kubernetes-api/authorization-resources/self-subject-access-review-v1/
 */
async function checkPermission(
  ctx: any,
  landscape: any,
  ns: string,
  verb: string,
  subresource?: string
): Promise<boolean> {
  const body = {
    apiVersion: "authorization.k8s.io/v1",
    kind: "SelfSubjectAccessReview",
    spec: {
      resourceAttributes: {
        namespace: ns,
        group: "core.gardener.cloud",
        resource: "shoots",
        verb,
        ...(subresource && { subresource }),
      },
    },
  }

  const response = await gardenerRequest(ctx, landscape, {
    method: "POST",
    path: SSAR_PATH,
    body,
    contentType: "application/json",
    schema: ssarResponseSchema,
    operation: `check permission ${verb}${subresource ? `/${subresource}` : ""}`,
  })

  return response?.status?.allowed ?? false
}

export const permissionsRouter = {
  getPermissions: projectScopedProcedure.input(kubernetesInputSchema).query(async ({ ctx, input }) =>
    withErrorHandling(async (): Promise<KubernetesPermissions> => {
      const { region } = resolveGardenerEndpoint(ctx, input.landscape)
      const ns = gardenNamespace(ctx, region)

      // Check all permissions in parallel
      const [list, get, create, update, deletePermission, adminKubeconfig] = await Promise.all([
        checkPermission(ctx, input.landscape, ns, "list"),
        checkPermission(ctx, input.landscape, ns, "get"),
        checkPermission(ctx, input.landscape, ns, "create"),
        checkPermission(ctx, input.landscape, ns, "update"),
        checkPermission(ctx, input.landscape, ns, "delete"),
        checkPermission(ctx, input.landscape, ns, "create", "adminkubeconfig"),
      ])

      return {
        clusters: {
          list,
          get,
          create,
          update,
          delete: deletePermission,
        },
        clustersAdminKubeconfig: adminKubeconfig,
      }
    }, "get permissions")
  ),
}
