import { createFileRoute, Outlet } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips")({
  staticData: {
    section: "network",
    service: "floatingips",
    crumb: { text: msg`Floating IPs` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
})
