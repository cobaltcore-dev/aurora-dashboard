import { createFileRoute } from "@tanstack/react-router"
import { SecurityGroups } from "../-components/SecurityGroups/List"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/securitygroups/")({
  staticData: { section: "network", service: "securitygroups" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  return <SecurityGroups />
}
