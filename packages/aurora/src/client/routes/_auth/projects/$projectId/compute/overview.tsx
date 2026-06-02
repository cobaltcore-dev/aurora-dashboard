import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { Overview } from "./-components/Overview"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/overview")({
  staticData: { section: "compute", service: "overview", crumb: { labelKey: "Compute" } } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Compute Overview` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return (
    <>
      <ContentHeading>{t`Compute Overview`}</ContentHeading>
      <Overview project={projectId} client={trpcClient!} />
    </>
  )
}
