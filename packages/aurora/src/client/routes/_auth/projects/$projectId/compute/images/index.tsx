import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { Images } from "../-components/Images/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/images/")({
  staticData: {
    section: "compute",
    service: "images",
    sectionCrumb: { labelKey: "Compute" },
    crumb: { labelKey: "Images" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Images` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  if (!trpcClient) {
    throw new Error("trpcClient is not available in route context")
  }

  return (
    <>
      <ContentHeader title={t`Images`} projectId={projectId} />
      <Images client={trpcClient} project={projectId} />
    </>
  )
}
