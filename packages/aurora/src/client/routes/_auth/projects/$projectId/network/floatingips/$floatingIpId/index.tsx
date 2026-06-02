import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Button, ContentHeading, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useProjectId } from "@/client/hooks"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpDetailsView } from "./-components/-details/FloatingIpDetailsView"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/$floatingIpId/")({
  staticData: {
    section: "network",
    service: "floatingips",
    isDetail: true,
    sectionCrumb: { labelKey: "Network" },
    crumb: { labelKey: "Floating IPs", to: "/projects/$projectId/network/floatingips" },
  } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const floatingIp = await context.trpcClient?.network.floatingIp.getById.query({
      project_id: params.projectId,
      floatingip_id: params.floatingIpId,
    })
    return { floatingIpAddress: floatingIp?.floating_ip_address ?? null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.floatingIpAddress ?? "Floating IP" }],
  }),
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
  return (
    <>
      <ContentHeading>{floatingIp.floating_ip_address}</ContentHeading>
      <FloatingIpDetailsView floatingIp={floatingIp} />
    </>
  )
}
