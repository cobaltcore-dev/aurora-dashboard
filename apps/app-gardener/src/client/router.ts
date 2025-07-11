import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export const router = ({ basepath }: { basepath: string }) =>
  createRouter({
    basepath,
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  })
