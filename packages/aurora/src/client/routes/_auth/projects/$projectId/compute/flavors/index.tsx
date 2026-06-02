import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Flavors } from "../-components/Flavors/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors/")({
  staticData: { section: "compute", service: "flavors", sectionCrumb: { label: "Compute", to: "/projects/$projectId/compute/overview" }, crumb: { label: "Flavors" } } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "Flavors" }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return (
    <>
      <ContentHeader title={t`Flavors`} projectId={projectId} />
      <Flavors project={projectId} client={trpcClient!} />
    </>
  )
}
