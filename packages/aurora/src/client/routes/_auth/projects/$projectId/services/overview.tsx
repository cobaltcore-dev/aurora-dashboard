import { createFileRoute } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import { ContentHeading } from "@cloudoperators/juno-ui-components"
import { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/services/overview")({
  staticData: { section: "services", service: "overview", crumb: { labelKey: "Services" } } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "Services Overview" }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  return (
    <>
      <ContentHeading>{t`Services Overview`}</ContentHeading>
      <div className="p-4 text-center">
        <Trans>Services Overview</Trans>
      </div>
    </>
  )
}
