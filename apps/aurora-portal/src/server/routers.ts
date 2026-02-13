import { authRouters } from "./Authentication/routers"
import { computeRouters } from "./Compute/routers"
import { projectRouters } from "./Project/routers"
import { gardenerRouters } from "./Gardener/routers"
import { networkRouters } from "./Network/routers"
import { auroraRouter, mergeRouters } from "./trpc"

export const appRouter = mergeRouters(
  auroraRouter(authRouters),
  auroraRouter(computeRouters),
  auroraRouter(projectRouters),
  auroraRouter(gardenerRouters),
  auroraRouter(networkRouters)
)

export type AuroraRouter = typeof appRouter
