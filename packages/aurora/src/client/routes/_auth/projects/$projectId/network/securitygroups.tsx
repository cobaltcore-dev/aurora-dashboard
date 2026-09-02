import { createFileRoute, Outlet } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/network/securitygroups")({
  staticData: {
    section: "network",
    service: "securitygroups",
    crumb: { text: msg`Security Groups` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
})
