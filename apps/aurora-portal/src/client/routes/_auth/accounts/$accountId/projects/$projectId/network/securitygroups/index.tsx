import { createFileRoute, redirect } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { SecurityGroups } from "./-components/-table/List"
import { getServiceIndex } from "@/server/Authentication/helpers"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/securitygroups/")({
  staticData: { section: "network", service: "securitygroups" } satisfies RouteInfo,
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
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()
  setPageTitle(t`Security Groups`)
  return <SecurityGroups />
}
