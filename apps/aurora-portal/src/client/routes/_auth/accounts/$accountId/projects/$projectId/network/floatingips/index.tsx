import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { FloatingIps } from "./-components/FloatingIps"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/floatingips/")({
  staticData: { section: "network", service: "floatingips" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()

  setPageTitle(t`Floating IPs`)

  return <FloatingIps />
}
