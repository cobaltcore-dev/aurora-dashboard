import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/floatingips")({
  staticData: { section: "network", service: "floatingips" } satisfies RouteInfo,
  component: () => <Outlet />,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId, projectId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["network"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    if (!serviceIndex["network"]["neutron"]) {
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/network/overview",
        params: { accountId, projectId },
      })
    }
  },
})
