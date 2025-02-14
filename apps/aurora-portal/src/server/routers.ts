import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"
import { serverExtensions } from "./generated/extensions"
import { auroraRouter, mergeRouters } from "./trpc"

const coreRouter = mergeRouters(auroraRouter(identityRouters), auroraRouter(computeRouters))

const extensionRouters = Object.fromEntries(
  Object.entries(serverExtensions).map(([key, value]) => [key, value.appRouter])
) as {
  [K in keyof typeof serverExtensions]: (typeof serverExtensions)[K]["appRouter"]
}

export const appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))

export type AuroraRouter = typeof appRouter
