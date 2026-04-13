import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute")({
  loader: async ({ context }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    return { availableServices }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    const serviceIndex = getServiceIndex(availableServices!)

    if (!serviceIndex["image"] && !serviceIndex["compute"] && !serviceIndex["network"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }
  },
  component: () => <Outlet />,
})
