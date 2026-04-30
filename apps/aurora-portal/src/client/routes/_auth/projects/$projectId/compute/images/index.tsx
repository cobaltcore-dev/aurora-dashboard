import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Images } from "../-components/Images/List"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/images/")({
  staticData: { section: "compute", service: "images" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Images`)
  return <Images client={trpcClient!} project={projectId} />
}
