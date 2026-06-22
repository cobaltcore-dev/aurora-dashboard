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

export const buildAppRouter = (policyDir: string, extraRouters: AnyRouter[] = []): AuroraRouter => {
  if (extraRouters.length === 0) return buildBaseRouter(policyDir)
  return mergeRouters(buildBaseRouter(policyDir), ...extraRouters) as unknown as AuroraRouter
}
