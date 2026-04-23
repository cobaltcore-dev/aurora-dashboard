import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { Instances } from "./-components/List"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"
import { useState } from "react"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/instances/")({
  staticData: { section: "compute", service: "instances" } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [viewMode] = useState<"list" | "card">("list")
  const { trpcClient, setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Instances`)
  return <Instances client={trpcClient!} project={projectId} viewMode={viewMode} />
}
