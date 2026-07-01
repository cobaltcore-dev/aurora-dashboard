import { createFileRoute, redirect } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { canAccessClavisPca } from "./-components/pcaAccess"
import { PcaListContainer } from "./-components/PcaListContainer"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/")({
  staticData: {
    section: "services",
    service: "pca",
    analytics: {
      name: "services.pca.list",
    },
    sectionCrumb: { labelKey: "Services" },
    crumb: { labelKey: "PCA (Clavis)" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`PCA` }] }),
  beforeLoad: async ({ context, params }) => {
    const availableServices = (await context.trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    if (!canAccessClavisPca(serviceIndex, context.enabledServices)) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId: params.projectId },
      })
    }
  },
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
