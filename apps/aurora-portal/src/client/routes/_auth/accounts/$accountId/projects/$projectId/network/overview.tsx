import { createFileRoute } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/overview")({
  staticData: { section: "network", service: "overview" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Network Overview`)
  return (
    <div className="p-4 text-center">
      <Trans>Network Overview</Trans>
    </div>
  )
}
