import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { trpcClient, trpcReact } from "./trpcClient"

export const router = createRouter({
  routeTree,
  context: {
    trpcReact,
    trpcClient,
    auth: undefined!,
    navItems: [],
    pageTitle: "Aurora",
    setPageTitle: undefined!,
    handleThemeToggle: undefined!,
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
