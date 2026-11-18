import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { NetworkSubnet } from "@/server/Network/types/network"
import ClipboardText from "@/client/components/ClipboardText"

interface NetworkSubnetsTableProps {
  subnets: NetworkSubnet[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  /** Re-runs the subnets query; shown as "Try Again" in the error state */
  onRetry?: () => void
}

/** Subnets of a network (read-only). */
export const NetworkSubnetsTable = ({ subnets, isLoading, isError, error, onRetry }: NetworkSubnetsTableProps) => {
  const { t } = useLingui()

  if (isLoading) {
    return <Status status="progress" title={t`Loading Subnets...`} />
  }

  if (isError) {
    return (
      <Status
        status="error"
        title={error?.message || t`Failed to Load Subnets`}
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

  const columns = [
    t`Name`,
    t`CIDR`,
    t`IP Version`,
    t`Gateway IP`,
    t`DHCP`,
    t`Allocation Pools`,
    t`DNS Nameservers`,
    t`Host Routes`,
  ]

  return (
    <DataGrid columns={columns.length} data-testid="network-subnets-table">
      <DataGridRow>
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {subnets.length > 0 ? (
        subnets.map((subnet) => (
          <DataGridRow key={subnet.id} data-testid={`network-subnet-row-${subnet.id}`}>
            {/* Name + ID copy affordance stacked */}
            <DataGridCell>
              <Stack direction="vertical" gap="0.5" className="min-w-0">
                {subnet.name ? (
                  <>
                    <span className="break-all">{subnet.name}</span>
                    <ClipboardText text={subnet.id} className="text-theme-light text-sm" truncateAt={13} />
                  </>
                ) : (
                  <ClipboardText text={subnet.id} truncateAt={13} />
                )}
              </Stack>
            </DataGridCell>
            <DataGridCell>{subnet.cidr}</DataGridCell>
            <DataGridCell>{`IPv${subnet.ip_version}`}</DataGridCell>
            <DataGridCell>{subnet.gateway_ip ?? "- -"}</DataGridCell>
            <DataGridCell>
              {subnet.enable_dhcp === undefined ? "- -" : subnet.enable_dhcp ? t`Yes` : t`No`}
            </DataGridCell>
            <DataGridCell>
              {subnet.allocation_pools.length > 0
                ? subnet.allocation_pools.map((p) => `${p.start}–${p.end}`).join(", ")
                : "- -"}
            </DataGridCell>
            <DataGridCell>{subnet.dns_nameservers.length > 0 ? subnet.dns_nameservers.join(", ") : "- -"}</DataGridCell>
            <DataGridCell>
              {subnet.host_routes.length > 0
                ? subnet.host_routes.map((r) => `${r.destination} → ${r.nexthop}`).join(", ")
                : "- -"}
            </DataGridCell>
          </DataGridRow>
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={columns.length}>
            <Status status="empty" title={t`No Subnets`} body={t`This network has no subnets.`} />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
