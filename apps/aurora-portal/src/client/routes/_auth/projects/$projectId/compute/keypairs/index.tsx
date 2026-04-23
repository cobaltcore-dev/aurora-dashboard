import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { KeyPairs } from "./-components/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/keypairs/")({
  staticData: { section: "compute", service: "keypairs" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Key Pairs`)
  return <KeyPairs client={trpcClient!} project={projectId} />
}
