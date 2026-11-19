import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { gardenerGet } from "../helpers/gardenerClient"
import {
  gardenerInfoConfigMapSchema,
  gardenerInfoInputSchema,
  parseGardenerApiServerVersion,
  type GardenerInfo,
} from "../types/gardenerInfo"

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
}
