import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Flavors } from "../-components/Flavors/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors/")({
  staticData: { section: "compute", service: "flavors" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Flavors`)
  return (
    <>
      <ContentHeading>{t`Flavors`}</ContentHeading>
      <Flavors project={projectId} client={trpcClient!} />
    </>
  )
}
