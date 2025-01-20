import { t } from "./trpc"
import { RouterLike } from "@trpc/react-query/shared"
import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"
import { registerServers } from "./generated/extensions"

const coreRouter = t.mergeRouters(t.router(identityRouters), t.router(computeRouters))
const extensionRouters = registerServers()

export const appRouter = t.mergeRouters(coreRouter, t.router(extensionRouters))

export type AuroraRouter = typeof appRouter
export type AuroraReactQueryRouter = RouterLike<AuroraRouter>
