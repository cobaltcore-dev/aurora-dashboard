import { createFileRoute, useNavigate, useParams, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { RouterDetailsView } from "./-components/RouterDetailsView"

const ROUTE_ID = "/_auth/projects/$projectId/network/routers/$routerId"

const HTTP_STATUS_BY_TRPC_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  INTERNAL_SERVER_ERROR: 500,
}

/**
 * tRPC error code (e.g. NOT_FOUND) from a TRPCClientError.
 * The message can't be used for this: the BFF returns readable messages like "Router x was not found."
 */
const getTrpcErrorCode = (error: unknown): string =>
  (error as { data?: { code?: string } } | null)?.data?.code ?? "UNKNOWN_ERROR"

interface RouterLoadErrorProps {
  error: unknown
  onRetry: () => void
}

/** Error state for the router details, shared by the route error component and the query error state. */
function RouterLoadError({ error, onRetry }: RouterLoadErrorProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ from: ROUTE_ID })
  const { translateError, isRetryableError } = useErrorTranslation()

  const errorCode = getTrpcErrorCode(error)
  const statusCode: number | undefined = HTTP_STATUS_BY_TRPC_CODE[errorCode]

  return (
    <RouteIdLevelDefaultError
      // null, not undefined: undefined would fall back to the component's default 404
      code={statusCode ?? null}
      errorTitle={statusCode === 404 ? t`Router Not Found` : t`Error Loading Router`}
      errorDescription={translateError(errorCode)}
      action={
        <ButtonRow>
          <Button
            variant="primary"
            onClick={() => navigate({ to: "/projects/$projectId/network/routers", params: { projectId } })}
          >
            <Trans>Back to Routers</Trans>
          </Button>
          <Button onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}>
            <Trans>Home</Trans>
          </Button>
          {isRetryableError(errorCode) && (
            <Button onClick={onRetry}>
              <Trans>Try Again</Trans>
            </Button>
          )}
        </ButtonRow>
      }
    />
  )
}

/** Errors thrown while rendering the route (the loader itself does not throw, see below). */
function RouterErrorComponent({ error, reset }: ErrorComponentProps) {
  const tanstackRouter = useRouter()

  const handleRetry = () => {
    reset()
    tanstackRouter.invalidate()
  }

  return <RouterLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute(ROUTE_ID)({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.detail",
    },
  } satisfies RouteInfo,
  // Only resolves the page title. Failures are rendered by the component's query,
  // which knows the actual tRPC error code and supports retry.
  loader: async ({ context, params }) => {
    try {
      const router = await context.trpcClient?.network.routers.getById.query({
        project_id: params.projectId,
        router_id: params.routerId,
      })
      return { routerName: router?.name || null }
    } catch {
      return { routerName: null }
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.routerName ?? "Router Details" }],
  }),
  component: RouteComponent,
  errorComponent: RouterErrorComponent,
})

function RouteComponent() {
  const { projectId, routerId } = useParams({ from: ROUTE_ID })
  const { t } = useLingui()

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

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Router Details...`} />
  }

  if (status === "error") {
    return <RouterLoadError error={error} onRetry={() => refetch()} />
  }

  return (
    <>
      <ContentHeader title={router.name || router.id} projectId={projectId} />
      <RouterDetailsView router={router} />
    </>
  )
}
