import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Flavors } from "./-components/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors/")({
  staticData: { section: "compute", service: "flavors" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Flavors`)
  return <Flavors client={trpcClient!} project={projectId} />
}
