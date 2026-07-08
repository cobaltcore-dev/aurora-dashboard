import { authRouters } from "./Authentication/routers"
import { buildComputeRouters } from "./Compute/routers"
import { buildObjectStorageRouters } from "./Storage/routers"
import { projectRouters } from "./Project/routers"
import { buildNetworkRouters } from "./Network/routers"
import { serviceRouters } from "./Services/routers"
import { auroraRouter, mergeRouters } from "./trpc"
import type { AnyRouter } from "@trpc/server"

const buildBaseRouter = (policyDir: string) =>
  mergeRouters(
    auroraRouter(authRouters),
    auroraRouter(buildComputeRouters(policyDir)),
    auroraRouter(buildObjectStorageRouters(policyDir)),
    auroraRouter(projectRouters),
    auroraRouter(buildNetworkRouters(policyDir)),
    auroraRouter(serviceRouters)
  )

export type AuroraRouter = ReturnType<typeof buildBaseRouter>

/**
 * Helper type to merge custom routers with the base Aurora router.
 * Use this in consuming apps to create a properly typed router that includes custom routers.
 *
 * @example
 * ```ts
 * import type { AuroraRouterWithCustom } from "@cobaltcore-dev/aurora/server"
 * import { customRouters } from "./server/customRouters"
 *
 * export type AppRouter = AuroraRouterWithCustom<typeof customRouters>
 * ```
 */
export type AuroraRouterWithCustom<TCustomRouters extends AnyRouter> = AuroraRouter & TCustomRouters

/**
 * Builds the complete app router by merging Aurora's base routers with optional custom routers.
 *
 * @param policyDir - Directory containing policy files
 * @param extraRouters - Optional array of custom tRPC routers to merge with base Aurora routers
 * @returns The merged router (base routers + custom routers)
 */
export const buildAppRouter = (policyDir: string, extraRouters: AnyRouter[] = []) => {
  if (extraRouters.length === 0) return buildBaseRouter(policyDir)
  return mergeRouters(buildBaseRouter(policyDir), ...extraRouters)
}
