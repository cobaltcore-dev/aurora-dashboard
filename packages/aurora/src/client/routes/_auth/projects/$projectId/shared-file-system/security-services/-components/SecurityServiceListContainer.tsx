import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { SecurityService } from "@/server/SharedFileSystem/types/securityService"
import { SecurityServiceTableRow } from "./SecurityServiceTableRow"

const COLUMN_COUNT = 7

interface SecurityServiceListContainerProps {
  securityServices: SecurityService[]
  isLoading: boolean
  error: { code?: string } | null
  isFiltered: boolean
  onRetry: () => void
}

export const SecurityServiceListContainer = ({
  securityServices,
  isLoading,
  error,
  isFiltered,
  onRetry,
}: SecurityServiceListContainerProps) => {
  const { t } = useLingui()

  return (
    <DataGrid
      columns={COLUMN_COUNT}
      minContentColumns={[6]}
      cellVerticalAlignment="top"
      data-testid="security-services-table"
    >
      <DataGridRow>
        {/* Status first: product decision for #1491 (same as the Shares list), deliberately overrides DataGrid DT-1 */}
        <DataGridHeadCell>
          <Trans>Status</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Name / ID</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Type</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>DNS IP</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Server</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Created</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell></DataGridHeadCell>
      </DataGridRow>

      {/* DT-7: Loading → Error → Empty/Filtered-Empty → Data */}
      {isLoading ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status status="progress" title={t`Loading Security Services...`} />
          </DataGridCell>
        </DataGridRow>
      ) : error ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            {error.code === "UNAUTHORIZED" ? (
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view security services.`}
              />
            ) : (
              <Status
                status="error"
                title={t`Failed to Load Security Services`}
                body={t`The security services could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            )}
          </DataGridCell>
        </DataGridRow>
      ) : securityServices.length === 0 ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status
              status={isFiltered ? "no-matches" : "empty"}
              title={isFiltered ? t`No Matching Security Services` : t`No Security Services Found`}
              body={isFiltered ? t`No security services match your filters` : t`No security services in this project`}
            />
          </DataGridCell>
        </DataGridRow>
      ) : (
        securityServices.map((service) => <SecurityServiceTableRow key={service.id} securityService={service} />)
      )}
    </DataGrid>
  )
}
