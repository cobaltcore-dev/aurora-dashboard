import { authRouters } from "./Authentication/routers"
import { computeRouters } from "./Compute/routers"
import { projectRouters } from "./Project/routers"
import { gardenerRouters } from "./Gardener/routers"

import { extensionRouters } from "./generated/extensions"

import { auroraRouter, mergeRouters } from "./trpc"

const coreRouter = mergeRouters(
  auroraRouter(authRouters),
  auroraRouter(computeRouters),
  auroraRouter(projectRouters),
  auroraRouter(gardenerRouters)
)

export const appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))

export type AuroraRouter = typeof appRouter
