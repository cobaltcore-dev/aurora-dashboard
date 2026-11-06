import { useLingui } from "@lingui/react/macro"
import { Button, Stack, Status } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { Link } from "@tanstack/react-router"
import type { Port } from "@/server/Network/types/port"
import ClipboardText from "@/client/components/ClipboardText"

interface NetworkRoutersTabProps {
  ports: Port[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  onRetry?: () => void
  projectId: string
  routersAvailable: boolean
}

/** Attached-routers list derived from ports with device_owner = "network:router_interface". */
export function NetworkRoutersTab({
  ports,
  isLoading,
  isError,
  error,
  onRetry,
  projectId,
  routersAvailable,
}: NetworkRoutersTabProps) {
  const { t } = useLingui()

  if (isLoading) {
    return <Status status="progress" title={t`Loading Routers...`} />
  }

  if (isError) {
    return (
      <Status
        status="error"
        title={error?.message || t`Failed to Load Routers`}
        action={
          onRetry && (
            <Button onClick={onRetry}>
              <Trans>Try Again</Trans>
            </Button>
          )
        }
      />
    )
  }

  // Deduplicate by device_id: a router can have one port per subnet
  const routerIds = [
    ...new Set(ports.filter((p) => p.device_owner === "network:router_interface").map((p) => p.device_id)),
  ].filter(Boolean)

  if (routerIds.length === 0) {
    return <span data-testid="routers-empty">{"- -"}</span>
  }

  return (
    <Stack direction="vertical" gap="2" data-testid="routers-list">
      {routerIds.map((id) =>
        routersAvailable ? (
          <Link
            key={id}
            to="/projects/$projectId/network/routers/$routerId"
            params={{ projectId, routerId: id }}
            className="text-theme-link hover:text-theme-default"
          >
            <ClipboardText text={id} data-testid={`router-item-${id}`} />
          </Link>
        ) : (
          <ClipboardText key={id} text={id} data-testid={`router-item-${id}`} />
        )
      )}
    </Stack>
  )
}
