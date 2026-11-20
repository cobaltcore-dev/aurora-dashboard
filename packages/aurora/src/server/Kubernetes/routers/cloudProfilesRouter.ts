import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { kubernetesInputSchema } from "../types/common"
import { cloudProfileListSchema } from "../types/cloudProfile"
import { CLOUD_PROFILES_PATH, gardenerRequest, resolveGardenerEndpoint } from "../helpers/gardenerClient"
import { mapCloudProfiles } from "../helpers/cloudProfileMapper"
import type { KubernetesLandscape } from "@/types/kubernetes"
import type { AuroraPortalContext } from "../../context"

/**
 * Fetches cloud profiles and returns a Map of cloudProfileName → kubernetesVersions.
 * Used internally by cluster list/getByName for versionUpdates.
 * On error, logs a warning and returns undefined (graceful degradation).
 */
export async function listCloudProfileVersions(
  ctx: AuroraPortalContext,
  landscape: KubernetesLandscape
): Promise<Map<string, string[]> | undefined> {
  try {
    const { region } = resolveGardenerEndpoint(ctx, landscape)
    const response = await gardenerRequest(ctx, landscape, {
      method: "GET",
      path: CLOUD_PROFILES_PATH,
      schema: cloudProfileListSchema,
      operation: "list cloud profiles",
    })
    if (!response) return undefined
    const profiles = mapCloudProfiles(response.items, region)
    const map = new Map<string, string[]>()
    for (const p of profiles) {
      map.set(p.name, p.kubernetesVersions)
    }
    return map
  } catch (error) {
    console.warn("[kubernetes] cloud profiles unavailable; version updates hidden", { landscape, error })
    return undefined
  }
}

export const cloudProfilesRouter = {
  list: projectScopedProcedure.input(kubernetesInputSchema).query(async ({ ctx, input }) =>
    withErrorHandling(async () => {
      const { region } = resolveGardenerEndpoint(ctx, input.landscape)
      const response = await gardenerRequest(ctx, input.landscape, {
        method: "GET",
        path: CLOUD_PROFILES_PATH,
        schema: cloudProfileListSchema,
        operation: "list cloud profiles",
      })
      if (!response) return []
      return mapCloudProfiles(response.items, region)
    }, "list cloud profiles")
  ),
}
