import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { gardenerGet, resolveGardenerEndpoint, gardenNamespace } from "../helpers/gardenerClient"
import { buildGardenKubeconfig } from "../helpers/kubeconfig"
import {
  gardenerInfoConfigMapSchema,
  gardenerInfoInputSchema,
  parseGardenerApiServerVersion,
  type GardenerInfo,
} from "../types/gardenerInfo"
import { kubernetesInputSchema } from "../types/common"

/**
 * Public `gardener-info` ConfigMap, visible to every authenticated user, so a 200 proves authentication only.
 * https://gardener.cloud/docs/gardener/configmap/
 */
const GARDENER_INFO_PATH = "api/v1/namespaces/gardener-system-public/configmaps/gardener-info"

export const gardenerInfoRouter = {
  getGardenerInfo: projectScopedProcedure
    .input(gardenerInfoInputSchema)
    .query(({ ctx, input }): Promise<GardenerInfo> =>
      withErrorHandling(async () => {
        const configMap = await gardenerGet(ctx, input.landscape, GARDENER_INFO_PATH, gardenerInfoConfigMapSchema)
        return {
          landscape: input.landscape,
          version: parseGardenerApiServerVersion(configMap.data?.gardenerAPIServer ?? undefined),
        }
      }, "getGardenerInfo")
    ),

  /**
   * Retrieves a garden kubeconfig for kubectl access to the Gardener garden cluster.
   * This is a mutation because it creates a session resource.
   *
   * Intentional exception: returns the user's project-scoped Keystone token (as `<region>:<token>`)
   * so kubectl can reach the garden cluster; parity with Elektra (D2). Never log this value.
   */
  getGardenKubeconfig: projectScopedProcedure.input(kubernetesInputSchema).mutation(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const { url, region, authToken } = resolveGardenerEndpoint(ctx, input.landscape)
      const namespace = gardenNamespace(ctx, region)
      const token = `${region}:${authToken}`

      const kubeconfig = buildGardenKubeconfig({
        server: url,
        namespace,
        token,
      })

      return { kubeconfig }
    }, "get garden kubeconfig")
  ),
}
