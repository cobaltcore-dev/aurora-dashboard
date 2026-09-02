import { useLingui } from "@lingui/react/macro"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { FloatingIp } from "@/server/Network/types/floatingIp"
import { FloatingIpTableRow } from "./FloatingIpTableRow"
import { TABLE_COLUMNS } from "./constants"

interface FloatingIpListContainerProps {
  floatingIps: FloatingIp[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
}

export const FloatingIpListContainer = ({ floatingIps, isLoading, isError, error }: FloatingIpListContainerProps) => {
  const { t } = useLingui()
  const columns = TABLE_COLUMNS()
  const columnCount = columns.length

  if (isLoading) {
    return <Status status="progress" title={t`Loading Floating IPs...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? t`Failed to load Floating IPs`} />
  }

  return (
    <DataGrid columns={columnCount} minContentColumns={[columnCount - 1]}>
      <DataGridRow>
        {columns.map((label) => (
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
              title={t`No Floating IPs found`}
              body={t`There are no Floating IPs available for this project. Floating IPs allow you to map public IP addresses to instances.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
