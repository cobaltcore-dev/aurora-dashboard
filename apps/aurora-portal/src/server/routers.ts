import { identityRouters } from "./Identity/routers"
import { computeRouters } from "./Compute/routers"
import { serverExtensions } from "./generated/extensions"
import { auroraRouter, mergeRouters } from "./trpc"

const coreRouter = mergeRouters(auroraRouter(identityRouters), auroraRouter(computeRouters))

export let appRouter = coreRouter

if (serverExtensions !== undefined && Object.keys(serverExtensions).length > 0) {
  const extensionRouters = Object.fromEntries(
    // @ts-expect-error Object entries
    Object.entries(serverExtensions).map(([key, value]) => [key, value.appRouter])
  ) as {
    [K in keyof typeof serverExtensions]: (typeof serverExtensions)[K]["appRouter"]
  }

  appRouter = mergeRouters(coreRouter, auroraRouter(extensionRouters))
}
export type AuroraRouter = typeof appRouter
