import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { FloatingIpsList } from "./-components/FloatingIpsList"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/")({
  staticData: { section: "network", service: "floatingips" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Floating IPs`)
  return <FloatingIpsList />
}
