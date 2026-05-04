import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors")({
  staticData: { section: "compute", service: "flavors" } satisfies RouteInfo,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }
  },
  component: () => <Outlet />,
})
