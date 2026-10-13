import { Button, Stack, Status } from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { useProjectId } from "@/client/hooks"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { trpcReact } from "@/client/trpcClient"
import { NetworkDetailsView } from "./-components/NetworkDetailsView"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"

export const Route = createFileRoute("/_auth/projects/$projectId/network/networks/$networkId/")({
  staticData: {
    section: "network",
    service: "networks",
    analytics: {
      name: "network.networks.detail",
    },
  } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const network = await context.trpcClient?.network.networks.getById.query({
      project_id: params.projectId,
      network_id: params.networkId,
    })
    return { networkTitle: network?.name || network?.id || null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.networkTitle ?? "Network" }],
  }),
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["network"] || !serviceIndex["network"]["neutron"]) {
      throw redirect({
        to: "/projects/$projectId/network/networks",
        params: { projectId: params.projectId },
      })
    }
  },
})

function RouteComponent() {
  const { networkId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  const projectId = useProjectId()
  const navigate = useNavigate()
  const { t } = useLingui()

  if (!trpcClient) {
    throw new Error("trpcClient is not available in route context")
  }

  const {
    data: network,
    isLoading,
    isError,
    error,
  } = trpcReact.network.networks.getById.useQuery({
    project_id: projectId,
    network_id: networkId,
  })

  useSetBreadcrumb(Route.id, network?.name ?? undefined)

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/network/networks",
      params: { projectId },
    })
  }

  if (isLoading) {
    return <Status status="progress" title={t`Loading Network Details...`} />
  }

  if (isError) {
    const errorMessage = error?.message || t`Unknown Error`
    return (
      <Status
        status="error"
        title={t`Error Loading Network`}
        body={errorMessage}
        action={
          <Button onClick={handleBack} variant="primary">
            <Trans>Back to Networks</Trans>
          </Button>
        }
      />
    )
  }

  if (!network) {
    return (
      <Status
        status="empty"
        title={t`Network Not Found`}
        action={
          <Button onClick={handleBack} variant="primary">
            <Trans>Back to Networks</Trans>
          </Button>
        }
      />
    )
  }

  return (
    <Stack direction="vertical">
      <ContentHeader title={network.name || network.id} projectId={projectId} />
      <NetworkDetailsView network={network} />
    </Stack>
  )
}
