import { Button, ButtonRow, Container, Status } from "@cloudoperators/juno-ui-components"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { RouterDetailsView } from "./-components/RouterDetailsView"

function RouterErrorComponent() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() => navigate({ to: "/projects/$projectId/network/routers", params: { projectId } })}
        >
          {t`Back to Routers`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers/$routerId")({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.detail",
    },
  } satisfies RouteInfo,
  loader: async ({ context, params }) => {
    const router = await context.trpcClient?.network.routers.getById.query({
      project_id: params.projectId,
      router_id: params.routerId,
    })
    return { routerName: router?.name || null }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.routerName ?? "Router Details" }],
  }),
  component: RouteComponent,
  errorComponent: RouterErrorComponent,
})

function RouteComponent() {
  const { projectId, routerId } = useParams({
    from: "/_auth/projects/$projectId/network/routers/$routerId",
  })
  const navigate = useNavigate()
  const { t } = useLingui()
  const { translateError, isRetryableError } = useErrorTranslation()

  const {
    data: router,
    status,
    error,
    refetch,
  } = trpcReact.network.routers.getById.useQuery({
    project_id: projectId,
    router_id: routerId,
  })

  useSetBreadcrumb(Route.id, router?.name || router?.id)

  const handleBack = () => {
    navigate({
      to: "/projects/$projectId/network/routers",
      params: { projectId },
    })
  }

  const handleHome = () => {
    navigate({
      to: "/projects/$projectId",
      params: { projectId },
    })
  }

  const handleRetry = () => {
    refetch()
  }

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Router Details...`} />
  }

  if (status === "error") {
    const errorCode = error?.message || "UNKNOWN_ERROR"
    const translatedError = translateError(errorCode)
    const canRetry = isRetryableError(errorCode)

    const getStatusCode = (code: string): number | undefined => {
      if (code.includes("UNAUTHORIZED")) return 401
      if (code.includes("FORBIDDEN")) return 403
      if (code.includes("NOT_FOUND")) return 404
      if (code.includes("SERVER_ERROR")) return 500
      return undefined
    }

    return (
      <Container className="py-8">
        <Status
          status="error"
          code={getStatusCode(errorCode)}
          title={t`Error Loading Router`}
          body={translatedError}
          action={
            <ButtonRow>
              <Button variant="primary" onClick={handleBack}>
                <Trans>Back</Trans>
              </Button>
              <Button onClick={handleHome}>
                <Trans>Home</Trans>
              </Button>
              {canRetry && (
                <Button onClick={handleRetry}>
                  <Trans>Try Again</Trans>
                </Button>
              )}
            </ButtonRow>
          }
        />
      </Container>
    )
  }

  if (!router) {
    return (
      <Container className="py-8">
        <Status
          status="error"
          code={404}
          title={t`Router Not Found`}
          body={t`The requested router could not be found. It may have been deleted or you may not have access to it.`}
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
      <ContentHeader title={router.name || router.id} projectId={projectId} />
      <RouterDetailsView router={router} />
    </>
  )
}
