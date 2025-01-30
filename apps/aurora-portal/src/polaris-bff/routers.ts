import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"
import { registerServers } from "./generated/extensions"
import { auroraRouter, mergeRouters } from "./trpc"
import { AuroraReactQueryRouterLike } from "@cobaltcore-dev/aurora-sdk"
const coreRouter = mergeRouters(auroraRouter(identityRouters), auroraRouter(computeRouters))
const extensionRouters = registerServers()

export const appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))

export type AuroraRouter = typeof appRouter
export type AuroraReactQueryRouter = AuroraReactQueryRouterLike<AuroraRouter>
