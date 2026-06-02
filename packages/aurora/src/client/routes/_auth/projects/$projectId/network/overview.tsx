import { createFileRoute } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/network/overview")({
  staticData: { section: "network", service: "overview", crumb: { label: "Network" } } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "Network Overview" }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  return (
    <>
      <ContentHeading>{t`Network Overview`}</ContentHeading>
      <div className="p-4 text-center">
        <Trans>Network Overview</Trans>
      </div>
    </>
  )
}
