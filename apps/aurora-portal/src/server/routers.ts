import { authRouters } from "./Authentication/routers"
import { computeRouters } from "./Compute/routers"
import { projectRouters } from "./Project/routers"

import { extensionRouters } from "./generated/extensions"

import { auroraRouter, mergeRouters } from "./trpc"

const coreRouter = mergeRouters(auroraRouter(authRouters), auroraRouter(computeRouters), auroraRouter(projectRouters))

export const appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))

export type AuroraRouter = typeof appRouter
