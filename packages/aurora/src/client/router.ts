import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import type { TrpcReact, TrpcClient } from "./trpcClient"
import type { AdditionalProjectService } from "./AuroraApp"
import type { AnyRoute } from "@tanstack/react-router"

type RouteWithChildren = {
  _addFileChildren: (c: Record<string, AnyRoute>) => void
  children?: Record<string, AnyRoute>
}

export function createAuroraRouter(
  trpcReact: TrpcReact,
  trpcClient: TrpcClient,
  additionalProjectServices?: AdditionalProjectService[]
) {
  const extraRoutes = additionalProjectServices?.map((m) => m.routes) ?? []

  if (extraRoutes.length > 0) {
    for (let i = 0; i < extraRoutes.length; i++) {
      const route = extraRoutes[i]
      const parentFn = (route as { options?: { getParentRoute?: () => AnyRoute } }).options?.getParentRoute
      if (!parentFn) {
        throw new Error(`additionalProjectServices[${i}] route is missing options.getParentRoute()`)
      }
      const parent = parentFn() as unknown as RouteWithChildren
      const existing = parent.children ?? {}
      parent._addFileChildren({ ...existing, [`_extra_${i}`]: route })
    }
  }

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
      additionalProjectServices: additionalProjectServices ?? [],
    },
  })
}

// Type registration — uses the shape of a router instance for global type inference
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAuroraRouter>
  }
}
