import { createFileRoute, useNavigate, useParams, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { PortDetailsView } from "./-components/PortDetailsView"

const ROUTE_ID = "/_auth/projects/$projectId/network/ports/$portId"

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
 * Port-specific on purpose: the shared useErrorTranslation only knows the flavor error codes.
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
 * The message can't be used for this: the BFF returns readable messages like "Port x was not found."
 */
const getTrpcErrorCode = (error: unknown): string =>
  (error as { data?: { code?: string } } | null)?.data?.code ?? "UNKNOWN_ERROR"

interface PortLoadErrorProps {
  error: unknown
  onRetry: () => void
}

/** Error state for the port details, shared by the route error component and the query error state. */
function PortLoadError({ error, onRetry }: PortLoadErrorProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ from: ROUTE_ID })

  const errorCode = getTrpcErrorCode(error)
  const statusCode: number | undefined = HTTP_STATUS_BY_TRPC_CODE[errorCode]
  const canRetry = RETRYABLE_TRPC_CODES.has(errorCode)

  const getErrorDescription = (): string => {
    switch (errorCode) {
      case "NOT_FOUND":
        return t`This port does not exist or has been deleted.`
      case "FORBIDDEN":
        return t`Access to this port is not permitted.`
      case "UNAUTHORIZED":
        return t`The session has expired. Log in again to continue.`
      default:
        return canRetry ? t`The port could not be loaded. Try again.` : t`The port could not be loaded.`
    }
  }

  return (
    <RouteIdLevelDefaultError
      // null, not undefined: undefined would fall back to the component's default 404
      code={statusCode ?? null}
      errorTitle={statusCode === 404 ? t`Port Not Found` : t`Error Loading Port`}
      errorDescription={getErrorDescription()}
      action={
        <ButtonRow>
          <Button
            variant="primary"
            onClick={() => navigate({ to: "/projects/$projectId/network/ports", params: { projectId } })}
          >
            <Trans>Back to Ports</Trans>
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
function PortErrorComponent({ error, reset }: ErrorComponentProps) {
  const tanstackRouter = useRouter()

  const handleRetry = () => {
    reset()
    tanstackRouter.invalidate()
  }

  return <PortLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/ports/$portId")({
  staticData: {
    section: "network",
    service: "ports",
    analytics: {
      name: "network.ports.detail",
    },
  } satisfies RouteInfo,
  // Only resolves the page title. Failures are rendered by the component's query,
  // which knows the actual tRPC error code and supports retry.
  loader: async ({ context, params }) => {
    try {
      const port = await context.trpcClient?.network.ports.getById.query({
        project_id: params.projectId,
        port_id: params.portId,
      })
      return { portName: port?.name || null }
    } catch {
      return { portName: null }
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.portName ?? "Port Details" }],
  }),
  component: RouteComponent,
  errorComponent: PortErrorComponent,
})

function RouteComponent() {
  const { projectId, portId } = useParams({ from: ROUTE_ID })
  const { t } = useLingui()

  const {
    data: port,
    status,
    error,
    refetch,
  } = trpcReact.network.ports.getById.useQuery({
    project_id: projectId,
    port_id: portId,
  })

  useSetBreadcrumb(Route.id, port?.name || port?.id)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Port Details...`} />
  }

  if (status === "error") {
    return <PortLoadError error={error} onRetry={() => refetch()} />
  }

  return (
    <>
      <ContentHeader title={port.name || port.id} projectId={projectId} />
      <PortDetailsView port={port} />
    </>
  )
}
