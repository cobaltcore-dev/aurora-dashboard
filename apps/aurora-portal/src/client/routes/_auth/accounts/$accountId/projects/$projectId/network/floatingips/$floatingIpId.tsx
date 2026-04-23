import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import { Button, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpDetailsView } from "./-components/-details/FloatingIpDetailsView"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId"
)({
  staticData: { section: "network", service: "floatingips", isDetail: true } satisfies RouteInfo,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId, floatingIpId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
  })
  const { setPageTitle } = Route.useRouteContext()

  const navigateToFloatingIps = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/floatingips",
      params: { accountId, projectId },
    })
  }

  const {
    data: floatingIp,
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.getById.useQuery({
    floatingip_id: floatingIpId,
  })

  if (isLoading) {
    setPageTitle(t`Loading...`)
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Floating IP Details...</Trans>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading Floating IP Details...</Trans>
        </p>
        <p className="text-theme-highest">{error?.message || "Unknown error"}</p>
        <Button onClick={navigateToFloatingIps} variant="primary">
          <Trans>Back to Floating IPs</Trans>
        </Button>
      </Stack>
    )
  }

  if (!floatingIp) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-highest">
          <Trans>Floating IP not found</Trans>
        </p>
        <Button onClick={navigateToFloatingIps} variant="primary">
          <Trans>Back to Floating IPs</Trans>
        </Button>
      </Stack>
    )
  }

  setPageTitle(`IP: ${floatingIp.floating_ip_address || floatingIpId}`)
  return <FloatingIpDetailsView floatingIp={floatingIp} />
}
