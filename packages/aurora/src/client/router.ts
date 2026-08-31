import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import type { TrpcReact, TrpcClient } from "./trpcClient"
import type { ServiceExtension } from "./AuroraApp"

export function createAuroraRouter(
  trpcReact: TrpcReact,
  trpcClient: TrpcClient,
  serviceExtensions?: ServiceExtension[]
) {
  return createRouter({
    routeTree,
    context: {
      trpcReact,
      trpcClient,
      auth: undefined!,
      navItems: [],
      handleThemeToggle: undefined!,
      slots: undefined,
      onTrackEvent: undefined,
      serviceExtensions: serviceExtensions ?? [],
    },
  })
}
