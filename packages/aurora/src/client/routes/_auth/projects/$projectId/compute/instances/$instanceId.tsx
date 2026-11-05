import { Button, ButtonRow, Stack, Container, Status } from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { InstanceDetailsView } from "./-components/InstanceDetailsView"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"

function InstanceErrorComponent() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() => navigate({ to: "/projects/$projectId/compute/instances", params: { projectId } })}
        >
          {t`Back to Instances`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/compute/instances/$instanceId")({
  staticData: {
    section: "compute",
    service: "instances",
    analytics: {
      name: "compute.instances.detail",
    },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "Instance Details" }] }),
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { projectId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []
    const serviceIndex = getServiceIndex(availableServices)

    if (!serviceIndex["compute"]?.["nova"]) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }
  },
  errorComponent: InstanceErrorComponent,
})

function RouteComponent() {
  const { projectId, instanceId } = useParams({
    from: "/_auth/projects/$projectId/compute/instances/$instanceId",
  })
  const navigate = useNavigate()
  const { t } = useLingui()

  // Detail reuses the list payload (one call, no per-instance lookup).
  const {
    data: servers,
    status,
    error,
    refetch,
  } = trpcReact.compute.getServersByProjectId.useQuery({
    project_id: projectId,
  })

  const instance = servers?.find((s) => s.id === instanceId)

  const instanceTitle = typeof instance?.name === "string" && instance.name ? instance.name : instanceId

  useSetBreadcrumb(Route.id, instanceTitle)

  const handleBack = () => navigate({ to: "/projects/$projectId/compute/instances", params: { projectId } })
  const handleHome = () => navigate({ to: "/projects/$projectId", params: { projectId } })

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Instance Details...`} />
  }

  if (status === "error") {
    return (
      <Container className="py-8">
        <Status
          status="error"
          title={t`Error Loading Instance`}
          body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
          action={
            <ButtonRow>
              <Button variant="primary" onClick={handleBack}>
                <Trans>Back</Trans>
              </Button>
              <Button onClick={() => refetch()}>
                <Trans>Try Again</Trans>
              </Button>
            </ButtonRow>
          }
        />
      </Container>
    )
  }

  if (!instance) {
    return (
      <Container className="py-8">
        <Status
          status="error"
          code={404}
          title={t`Instance Not Found`}
          body={t`The requested instance could not be found. It may have been deleted or you may not have access to it.`}
          action={
            <ButtonRow>
              <Button variant="primary" onClick={handleBack}>
                <Trans>Back</Trans>
              </Button>
              <Button onClick={handleHome}>
                <Trans>Home</Trans>
              </Button>
            </ButtonRow>
          }
        />
      </Container>
    )
  }

  return (
    <>
      <ContentHeader title={instanceTitle} projectId={projectId} />
      <Stack direction="vertical">
        <InstanceDetailsView instance={instance} />
      </Stack>
    </>
  )
}
