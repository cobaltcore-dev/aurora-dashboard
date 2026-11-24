import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { ShareTableRow } from "./ShareTableRow"

const COLUMN_COUNT = 10

interface ShareListContainerProps {
  shares: Share[]
  isLoading: boolean
  error: { message: string; code?: string } | null
  isFiltered: boolean
  onRetry: () => void
}

export const ShareListContainer = ({ shares, isLoading, error, isFiltered, onRetry }: ShareListContainerProps) => {
  const { t } = useLingui()

  return (
    <DataGrid columns={COLUMN_COUNT} minContentColumns={[9]} cellVerticalAlignment="top" data-testid="shares-table">
      <DataGridRow>
        {/* Status first: product decision for #1487, deliberately overrides DataGrid DT-1 */}
        <DataGridHeadCell>
          <Trans>Status</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Name / ID</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Protocol</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Size (GiB)</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Share Type</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Availability Zone</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Visibility</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Share Network</Trans>
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
            <Status status="progress" title={t`Loading Shares...`} />
          </DataGridCell>
        </DataGridRow>
      ) : error ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            {error.code === "UNAUTHORIZED" ? (
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view shares.`}
              />
            ) : (
              <Status
                status="error"
                title={t`Failed to Load Shares`}
                body={error.message || t`An unexpected error occurred.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            )}
          </DataGridCell>
        </DataGridRow>
      ) : shares.length === 0 ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status
              status={isFiltered ? "no-matches" : "empty"}
              title={isFiltered ? t`No Matching Shares` : t`No Shares Found`}
              body={isFiltered ? t`No shares match your filters` : t`No shares in this project`}
            />
          </DataGridCell>
        </DataGridRow>
      ) : (
        shares.map((share) => <ShareTableRow key={share.id} share={share} />)
      )}
    </DataGrid>
  )
}
