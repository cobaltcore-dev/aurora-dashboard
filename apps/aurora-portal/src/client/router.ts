import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { trpcClient, trpcReact } from "./trpcClient"

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export const router = createRouter({
  routeTree,
  context: {
    trpcReact,
    trpcClient,
    auth: undefined!,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
})
