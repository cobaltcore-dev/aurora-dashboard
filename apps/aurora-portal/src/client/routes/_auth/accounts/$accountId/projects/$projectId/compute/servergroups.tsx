import { createFileRoute, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ServerGroups } from "./-components/ServerGroups/List"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/servergroups")({
  staticData: { section: "compute", service: "servergroups" } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId, projectId } = params
    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) ?? []
    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/compute/overview",
        params: { accountId, projectId },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return <ServerGroups project={projectId} client={trpcClient!} />
}
