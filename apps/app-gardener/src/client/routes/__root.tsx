import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { TrpcClient } from "../trpcClient"

export interface GardenerRouterContext {
  trpcClient?: TrpcClient
}

export const Route = createRootRouteWithContext<GardenerRouterContext>()({
  component: Layout,
})

function Layout() {
  return <Outlet />
}
