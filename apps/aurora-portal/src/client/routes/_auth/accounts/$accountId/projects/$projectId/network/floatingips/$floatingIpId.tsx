import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { useLingui, Trans } from "@lingui/react/macro"
import { Breadcrumb, BreadcrumbItem, Button, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpDetailsView } from "./-components/-details/FloatingIpDetailsView"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId"
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { accountId, projectId, floatingIpId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/network/floatingips/$floatingIpId",
  })

  const navigateToProjectNetwork = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/network/$",
      params: { accountId, projectId, _splat: undefined },
    })
  }

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

  return (
    <Stack direction="vertical">
      <Breadcrumb className="my-6">
        <BreadcrumbItem icon="home" label={t`Overview`} onClick={navigateToProjectNetwork} />
        <BreadcrumbItem label={t`Floating IPs`} onClick={navigateToFloatingIps} />
        <BreadcrumbItem active label={floatingIpId} />
      </Breadcrumb>

      <FloatingIpDetailsView floatingIp={floatingIp} />
    </Stack>
  )
}
