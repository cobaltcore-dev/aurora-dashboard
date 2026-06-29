import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { ROUTE_SECTIONS, ROUTE_SERVICES, type RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { PcaListContainer } from "./-components/PcaListContainer"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/")({
  staticData: {
    section: ROUTE_SECTIONS.SERVICES,
    service: ROUTE_SERVICES.PCA,
    sectionCrumb: { labelKey: "Services" },
    crumb: { labelKey: "PCA (Clavis)" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`PCA` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()

  return (
    <>
      <ContentHeader title={t`PCA`} projectId={projectId} />
      <PcaListContainer />
    </>
  )
}
