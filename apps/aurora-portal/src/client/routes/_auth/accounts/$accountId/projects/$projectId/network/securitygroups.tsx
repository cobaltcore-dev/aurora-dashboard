import { createFileRoute, Outlet } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/securitygroups")({
  staticData: { section: "network", service: "securitygroups" } satisfies RouteInfo,
  component: () => <Outlet />,
})
