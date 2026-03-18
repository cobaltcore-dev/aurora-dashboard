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
}

export const FloatingIpListContainer = ({ floatingIps, isLoading, isError, error }: FloatingIpListContainerProps) => {
  const { t } = useLingui()

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
      <DataGrid columns={TABLE_COLUMNS().length} className="floating-ips" data-testid="no-floating-ips">
        <DataGridRow>
          <DataGridCell colSpan={TABLE_COLUMNS().length}>
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
    <DataGrid columns={TABLE_COLUMNS().length}>
      <DataGridRow>
        {TABLE_COLUMNS().map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
        {floatingIps.map((ip) => (
          <FloatingIpTableRow key={ip.id} floatingIp={ip} />
        ))}
      </DataGridRow>
    </DataGrid>
  )
}
