import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Overview } from "./-components/Overview"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/overview/")({
  staticData: { section: "compute", service: "overview" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Compute Overview`)
  return <Overview client={trpcClient!} project={projectId} />
}
