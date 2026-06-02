import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { PcaListContainer } from "./-components/PcaListContainer"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/")({
  staticData: { section: "services", service: "pca", sectionCrumb: { label: "Services" }, crumb: { label: "PCA (Clavis)" } } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "PCA" }] }),
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
