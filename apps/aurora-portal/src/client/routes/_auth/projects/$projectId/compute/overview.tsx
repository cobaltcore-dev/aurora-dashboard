import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Overview } from "./-components/Overview"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/overview")({
  staticData: { section: "compute", service: "overview" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Compute Overview`)
  return (
    <>
      <ContentHeading>{t`Compute Overview`}</ContentHeading>
      <Overview project={projectId} client={trpcClient!} />
    </>
  )
}
