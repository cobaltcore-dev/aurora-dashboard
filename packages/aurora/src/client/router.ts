import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import type { TrpcReact, TrpcClient } from "./trpcClient"

export function createAuroraRouter(trpcReact: TrpcReact, trpcClient: TrpcClient) {
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
    },
  })
}

// Type registration — uses the shape of a router instance for global type inference
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAuroraRouter>
  }
}
