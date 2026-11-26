import { Link } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { Port } from "@/server/Network/types/port"
import type { RouterListItem } from "@/server/Network/types/router"
import { useProjectId } from "@/client/hooks"
import { StatusLabel } from "@/client/components/StatusLabel"
import { NameIdCell, NAME_ID_LINK_CLASS } from "@/client/components/NameIdCell"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"

interface NetworkRoutersTabProps {
  ports: Port[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  onRetry?: () => void
  routersAvailable: boolean
  /** Resolves an attached router ID to its details; absent entries fall back to the ID only. */
  routersById?: Map<string, RouterListItem>
}

/** Attached-routers list derived from ports with device_owner = "network:router_interface". */
export function NetworkRoutersTab({
  ports,
  isLoading,
  isError,
  error,
  onRetry,
  routersAvailable,
  routersById,
}: NetworkRoutersTabProps) {
  const { t } = useLingui()
  const projectId = useProjectId()

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
    return <Status status="empty" title={t`No Routers Attached`} body={t`No routers are attached to this network.`} />
  }

  const columns = [t`Status`, t`Name / ID`, t`Admin State`, t`External Gateway`]

  return (
    <DataGrid columns={columns.length} data-testid="routers-list">
      <DataGridRow>
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {routerIds.map((id) => {
        const router = routersAvailable ? routersById?.get(id) : undefined
        const gateway = router?.external_gateway_info
        return (
          <DataGridRow key={id} data-testid={`router-item-${id}`}>
            <DataGridCell>{router ? <StatusLabel value={router.status} /> : EMPTY_VALUE}</DataGridCell>
            <DataGridCell>
              <NameIdCell
                name={router?.name}
                id={id}
                renderLink={
                  routersAvailable
                    ? (text) => (
                        <Link
                          to="/projects/$projectId/network/routers/$routerId"
                          params={{ projectId, routerId: id }}
                          className={NAME_ID_LINK_CLASS}
                        >
                          {text}
                        </Link>
                      )
                    : undefined
                }
              />
            </DataGridCell>
            <DataGridCell>
              {router ? <StatusLabel value={router.admin_state_up ? t`UP` : t`DOWN`} /> : EMPTY_VALUE}
            </DataGridCell>
            <DataGridCell>
              {gateway ? <span className="break-all">{gateway.network_name || gateway.network_id}</span> : EMPTY_VALUE}
            </DataGridCell>
          </DataGridRow>
        )
      })}
    </DataGrid>
  )
}
