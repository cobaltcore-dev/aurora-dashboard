import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  Stack,
  Spinner,
} from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpTableRow } from "./FloatingIpTableRow"
import { TABLE_COLUMNS } from "./constants"

interface FloatingIpListContainerProps {
  floatingIps: FloatingIp[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  selectedFloatingIps: string[]
  setSelectedFloatingIps: (ids: string[]) => void
  hasAnyBulkAction?: boolean
}

export const FloatingIpListContainer = ({
  floatingIps,
  isLoading,
  isError,
  error,
  selectedFloatingIps,
  setSelectedFloatingIps,
  hasAnyBulkAction = true,
}: FloatingIpListContainerProps) => {
  const { t } = useLingui()
  const columns = TABLE_COLUMNS()
  const columnCount = hasAnyBulkAction ? columns.length + 1 : columns.length

  if (isLoading) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading...</Trans>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {error?.message ?? t`Failed to load Floating IPs`}
      </Stack>
    )
  }

  if (floatingIps.length === 0) {
    return (
      <DataGrid columns={columnCount} className="floating-ips" data-testid="no-floating-ips">
        <DataGridRow>
          <DataGridCell colSpan={columnCount}>
            <ContentHeading>
              <Trans>No Floating IPs found</Trans>
            </ContentHeading>
            <p>
              <Trans>
                There are no Floating IPs available for this project. Floating IPs allow you to map public IP addresses
                to instances.
              </Trans>
            </p>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={columnCount}>
      <DataGridRow>
        {hasAnyBulkAction && <DataGridHeadCell />}
        {columns.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {floatingIps.map((ip) => (
        <FloatingIpTableRow
          key={ip.id}
          floatingIp={ip}
          isSelected={selectedFloatingIps.includes(ip.id)}
          onSelect={(id, checked) => {
            if (checked) {
              setSelectedFloatingIps([...selectedFloatingIps, id])
            } else {
              setSelectedFloatingIps(selectedFloatingIps.filter((selectedId) => selectedId !== id))
            }
          }}
          showSelectColumn={hasAnyBulkAction}
        />
      ))}
    </DataGrid>
  )
}
