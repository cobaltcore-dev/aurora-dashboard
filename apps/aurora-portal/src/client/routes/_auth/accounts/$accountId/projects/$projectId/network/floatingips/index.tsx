import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { FloatingIps } from "./-components/FloatingIps"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/floatingips/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()

  setPageTitle(t`Floating IPs`)

  return <FloatingIps />
}
