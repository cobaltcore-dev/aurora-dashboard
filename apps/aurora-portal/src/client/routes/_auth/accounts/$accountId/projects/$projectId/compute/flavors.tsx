import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/flavors")({
  staticData: { section: "compute", service: "flavors" } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId, projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/compute/overview",
        params: { accountId, projectId },
      })
    }
  },
  component: () => <Outlet />,
})
