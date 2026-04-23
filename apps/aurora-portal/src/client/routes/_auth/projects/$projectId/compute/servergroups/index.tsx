import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { ServerGroups } from "./-components/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/servergroups/")({
  staticData: { section: "compute", service: "servergroups" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Server Groups`)
  return <ServerGroups client={trpcClient!} project={projectId} />
}
