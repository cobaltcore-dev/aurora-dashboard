import { createFileRoute, Outlet } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/orders")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Orders` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
})
