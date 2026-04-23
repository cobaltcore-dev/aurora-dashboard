import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useProjectId } from "@/client/hooks"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpDetailsView } from "./-components/-details/FloatingIpDetailsView"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/$floatingIpId/")({
  staticData: { section: "network", service: "floatingips", isDetail: true } satisfies RouteInfo,
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    // Redirect if network service not available
    if (!serviceIndex["network"]) {
      throw redirect({
        to: "/projects/$projectId/network/floatingips",
        params: { projectId: params.projectId },
      })
    }

    if (!serviceIndex["network"]["neutron"]) {
      throw redirect({
        to: "/projects/$projectId/network/floatingips",
        params: { projectId: params.projectId },
      })
    }
  },
})

function RouteComponent() {
  const { floatingIpId } = Route.useParams()
  const projectId = useProjectId()
  const navigate = useNavigate()
  const { t } = useLingui()
  const { setPageTitle } = Route.useRouteContext()

  // Fetch floating IP details
  const {
    data: floatingIp,
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.getById.useQuery({
    project_id: projectId,
    floatingip_id: floatingIpId,
  })

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/network/floatingips",
      params: { projectId },
    })
  }

  // Loading state
  if (isLoading) {
    setPageTitle(t`Loading...`)
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Floating IP Details...</Trans>
      </Stack>
    )
  }

  // Error state
  if (isError) {
    const errorMessage = error?.message || "Unknown error"
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading floating IP</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Floating IPs</Trans>
        </Button>
      </Stack>
    )
  }

  // No data state
  if (!floatingIp) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-secondary">
          <Trans>Floating IP not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Floating IPs</Trans>
        </Button>
      </Stack>
    )
  }

  // Success state
  setPageTitle(floatingIp.floating_ip_address)
  return <FloatingIpDetailsView floatingIp={floatingIp} />
}
