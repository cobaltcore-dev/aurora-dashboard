import { authRouters } from "./Authentication/routers"
import { computeRouters } from "./Compute/routers"
import { objectStorageRouters } from "./Storage/routers"
import { projectRouters } from "./Project/routers"
import { gardenerRouters } from "./Gardener/routers"
import { auroraRouter, mergeRouters } from "./trpc"

export const appRouter = mergeRouters(
  auroraRouter(authRouters),
  auroraRouter(computeRouters),
  auroraRouter(objectStorageRouters),
  auroraRouter(projectRouters),
  auroraRouter(gardenerRouters)
)

export type AuroraRouter = typeof appRouter
