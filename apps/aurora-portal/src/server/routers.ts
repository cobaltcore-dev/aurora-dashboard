import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"
import { projectRouters } from "./Project/routers"

import { extensionRouters } from "./generated/extensions"

import { auroraRouter, mergeRouters } from "./trpc"

const coreRouter = mergeRouters(
  auroraRouter(identityRouters),
  auroraRouter(computeRouters),
  auroraRouter(projectRouters)
)

export const appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))

export type AuroraRouter = typeof appRouter
