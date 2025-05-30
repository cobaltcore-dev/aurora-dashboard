import { TanStackRouterVite } from "@tanstack/router-plugin/vite"

export const TanStackRouterPlugin = () =>
  TanStackRouterVite({
    target: "react",
    autoCodeSplitting: true,
    generatedRouteTree: "./src/client/routeTree.gen.ts",
    routesDirectory: "./src/client/routes",
  })
