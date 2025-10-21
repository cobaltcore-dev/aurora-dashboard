import { getServiceIndex } from "@/server/Authentication/helpers"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    const serviceIndex = getServiceIndex(availableServices || [])

    if (!serviceIndex["network"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }
  },
})

function RouteComponent() {
  return <div>Hello "/accounts/$accountId/projects_/$projectId/network/"!</div>
}
