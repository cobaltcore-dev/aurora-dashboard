import { createFileRoute, useNavigate, useParams, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import {
  RouterDetailsView,
  DEFAULT_ROUTER_DETAILS_TAB,
  isRouterDetailsTab,
  type RouterDetailsTab,
} from "./-components/RouterDetailsView"

const ROUTE_ID = "/_auth/projects/$projectId/network/routers/$routerId"

const HTTP_STATUS_BY_TRPC_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}

/**
 * Transient failures worth retrying. UNKNOWN_ERROR covers errors without a tRPC code (e.g. the request never reached the BFF).
 * Router-specific on purpose: the shared useErrorTranslation only knows the flavor error codes.
 */
const RETRYABLE_TRPC_CODES: ReadonlySet<string> = new Set([
  "INTERNAL_SERVER_ERROR",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
  "UNKNOWN_ERROR",
])

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

  const errorCode = getTrpcErrorCode(error)
  const statusCode: number | undefined = HTTP_STATUS_BY_TRPC_CODE[errorCode]
  const canRetry = RETRYABLE_TRPC_CODES.has(errorCode)

  const getErrorDescription = (): string => {
    switch (errorCode) {
      case "NOT_FOUND":
        return t`This router does not exist or has been deleted.`
      case "FORBIDDEN":
        return t`Access to this router is not permitted.`
      case "UNAUTHORIZED":
        return t`The session has expired. Log in again to continue.`
      default:
        return canRetry ? t`The router could not be loaded. Try again.` : t`The router could not be loaded.`
    }
  }

  return (
    <RouteIdLevelDefaultError
      // null, not undefined: undefined would fall back to the component's default 404
      code={statusCode ?? null}
      errorTitle={statusCode === 404 ? t`Router Not Found` : t`Error Loading Router`}
      errorDescription={getErrorDescription()}
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
          {canRetry && (
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

export type RouterDetailsSearchParams = {
  /** Active details tab; omitted for the default tab */
  tab?: RouterDetailsTab
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers/$routerId")({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.detail",
    },
  } satisfies RouteInfo,
  // Unknown tab values are dropped, so the view falls back to the default tab
  validateSearch: (search: Record<string, unknown>): RouterDetailsSearchParams => ({
    tab: isRouterDetailsTab(search.tab) ? search.tab : undefined,
  }),
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
  const { tab: activeTab = DEFAULT_ROUTER_DETAILS_TAB } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { t } = useLingui()

  // Replace instead of push: switching tabs shouldn't add history entries, so Back returns to the list
  const handleTabChange = (tab: RouterDetailsTab) => {
    navigate({
      search: (prev) => ({ ...prev, tab: tab === DEFAULT_ROUTER_DETAILS_TAB ? undefined : tab }),
      replace: true,
    })
  }

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
      <RouterDetailsView router={router} activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  )
}
