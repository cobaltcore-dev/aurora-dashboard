import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { Button, Spinner, Stack } from "@cloudoperators/juno-ui-components/index"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { PcaDetailsView } from "./-components/PcaDetailsView"

export const Route = createFileRoute("/_auth/projects/$projectId/services/pca/$pcaId/")({
  staticData: { section: "services", service: "pca", isDetail: true } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const pca = await context.trpcClient?.services.pca.getById.query({
      project_id: params.projectId,
      certificate_authority_id: params.pcaId,
    })
    return { pcaTitle: pca?.configuration?.subject?.common_name || pca?.id || null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.pcaTitle ?? "Certificate Authority" }],
  }),
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)
    // temporary as clavis is not fully GA, after GA replace with ["pca"]?.["clavis"]
    const pcaServices = serviceIndex["pca"]?.["clavis-beta"] || serviceIndex["pca"]?.["clavis-dev"]

    // Redirect if clavis service not available
    if (!pcaServices) {
      throw redirect({
        to: "/projects/$projectId/services/pca",
        params: { projectId: params.projectId },
      })
    }
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const projectId = useProjectId()
  const { pcaId } = Route.useParams()

  const {
    isLoading,
    isError,
    error,
    data: pca,
  } = trpcReact.services.pca.getById.useQuery({
    project_id: projectId,
    certificate_authority_id: pcaId,
  })

  // Loading state
  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Certificate Authority Details...</Trans>
      </Stack>
    )
  }

  const handleBack = () =>
    navigate({
      to: "/projects/$projectId/services/pca",
      params: { projectId },
    })

  // Error state
  if (isError) {
    const errorMessage = error?.message || "Unknown error"
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading Certificate Authority</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Certificate Authorities</Trans>
        </Button>
      </Stack>
    )
  }

  // No data state
  if (!pca) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-secondary">
          <Trans>Certificate Authority not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Certificate Authorities</Trans>
        </Button>
      </Stack>
    )
  }

  return <PcaDetailsView pca={pca} />
}
