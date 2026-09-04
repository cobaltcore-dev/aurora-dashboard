import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Button, Status } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useProjectId } from "@/client/hooks"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { FloatingIpDetailsView } from "./-components/-details/FloatingIpDetailsView"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/$floatingIpId/")({
  staticData: {
    section: "network",
    service: "floatingips",
    analytics: {
      name: "network.floatingips.detail",
    },
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
  const { t } = useLingui()

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

  useSetBreadcrumb(Route.id, floatingIp?.floating_ip_address)

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/network/floatingips",
      params: { projectId },
    })
  }

  // Loading state
  if (isLoading) {
    return <Status status="progress" title={t`Loading Floating IP Details...`} />
  }

  // Error state
  if (isError || !floatingIp) {
    const errorMessage = error?.message || t`Error loading floating IP`
    return (
      <Status
        status="error"
        title={isError ? errorMessage : t`Floating IP not found`}
        action={
          <Button onClick={handleBack} variant="primary">
            <Trans>Back to Floating IPs</Trans>
          </Button>
        }
      />
    )
  }

  return <FloatingIpDetailsView floatingIp={floatingIp} />
}
