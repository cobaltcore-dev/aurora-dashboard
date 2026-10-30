import { createFileRoute, Outlet } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/containers")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Containers` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
})
