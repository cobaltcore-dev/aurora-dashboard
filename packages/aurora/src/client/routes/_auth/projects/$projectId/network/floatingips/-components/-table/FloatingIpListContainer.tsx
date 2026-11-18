import { useLingui } from "@lingui/react/macro"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpTableRow } from "./FloatingIpTableRow"

interface FloatingIpListContainerProps {
  floatingIps: FloatingIp[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
}

export const FloatingIpListContainer = ({ floatingIps, isLoading, isError, error }: FloatingIpListContainerProps) => {
  const { t } = useLingui()

  const TABLE_COLUMNS = [
    t`Status`,
    t`Floating IP Address`,
    t`Fixed IP Address`,
    t`Subnet`,
    t`Description`,
    "", // empty column for item-actions with context menu containing "Show Details", "Edit Description", "Attach", "Detach" and "Release"
  ] as const
  const columnCount = TABLE_COLUMNS.length

  if (isLoading) {
    return <Status status="progress" title={t`Loading Floating IPs...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? t`Failed to Load Floating IPs`} />
  }

  return (
    <DataGrid columns={columnCount} minContentColumns={[columnCount - 1]}>
      <DataGridRow>
        {TABLE_COLUMNS.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {floatingIps.length > 0 ? (
        floatingIps.map((ip) => <FloatingIpTableRow key={ip.id} floatingIp={ip} />)
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={columnCount}>
            <Status
              status="empty"
              title={t`No Floating IPs Found`}
              body={t`There are no Floating IPs available for this project. Floating IPs allow you to map public IP addresses to instances.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
