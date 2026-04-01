import { createFileRoute, redirect } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { FloatingIps } from "./-components/FloatingIps"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/floatingips/")({
  component: RouteComponent,
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
        to: "/accounts/$accountId/projects/$projectId/network/$",
        params: { accountId, projectId, _splat: undefined },
      })
    }
  },
})

function RouteComponent() {
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()

  setPageTitle(t`Floating IPs`)

  return <FloatingIps />
}
