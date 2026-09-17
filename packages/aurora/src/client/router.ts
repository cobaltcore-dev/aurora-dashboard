import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import type { TrpcReact, TrpcClient } from "./trpcClient"
import type { ServiceExtension } from "./AuroraApp"
import { ServiceLevelDefaultError } from "./components/Errors/ServiceLevelDefaultError"

export function createAuroraRouter(
  trpcReact: TrpcReact,
  trpcClient: TrpcClient,
  serviceExtensions?: ServiceExtension[]
) {
  return createRouter({
    routeTree,
    defaultNotFoundComponent: ServiceLevelDefaultError,
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

// Type registration — uses the shape of a router instance for global type inference
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAuroraRouter>
  }
}
