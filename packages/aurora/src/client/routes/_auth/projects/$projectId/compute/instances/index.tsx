import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { Instances } from "./-components/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/instances/")({
  staticData: {
    section: "compute",
    service: "instances",
    analytics: {
      name: "compute.instances.list",
    },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Instances` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return (
    <>
      <ContentHeader title={t`Instances`} projectId={projectId} />
      <Instances project={projectId} client={trpcClient!} />
    </>
  )
}
