import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { ContentHeading } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { PcaListContainer } from "./-components/PcaListContainer"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/")({
  staticData: { section: "services", service: "pca" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()
  setPageTitle(t`PCA`)
  return (
    <>
      <ContentHeading>{t`PCA`}</ContentHeading>
      <PcaListContainer />
    </>
  )
}
