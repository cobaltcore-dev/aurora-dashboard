import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  DataGridRow,
  Status,
} from "@cloudoperators/juno-ui-components"
import type { ShareNetwork } from "@/server/SharedFileSystem/types/shareNetwork"
import { ShareNetworkTableRow } from "./ShareNetworkTableRow"

const COLUMN_COUNT = 4

interface ShareNetworkListContainerProps {
  shareNetworks: ShareNetwork[]
  isLoading: boolean
  error: { code?: string } | null
  isFiltered: boolean
  onRetry: () => void
}

export const ShareNetworkListContainer = ({
  shareNetworks,
  isLoading,
  error,
  isFiltered,
  onRetry,
}: ShareNetworkListContainerProps) => {
  const { t } = useLingui()

  return (
    <DataGrid
      columns={COLUMN_COUNT}
      minContentColumns={[3]}
      cellVerticalAlignment="top"
      data-testid="share-networks-table"
    >
      <DataGridRow>
        <DataGridHeadCell>
          <Trans>Name / ID</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Subnet Count</Trans>
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
            <Status status="progress" title={t`Loading Share Networks...`} />
          </DataGridCell>
        </DataGridRow>
      ) : error ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            {error.code === "UNAUTHORIZED" ? (
              <Status
                status="error"
                title={t`Session Expired`}
                body={t`Your session has expired. Sign in again to view share networks.`}
              />
            ) : (
              <Status
                status="error"
                title={t`Failed to Load Share Networks`}
                body={t`The share networks could not be loaded.`}
                action={<Button size="xs" label={t`Try Again`} onClick={onRetry} />}
              />
            )}
          </DataGridCell>
        </DataGridRow>
      ) : shareNetworks.length === 0 ? (
        <DataGridRow>
          <DataGridCell colSpan={COLUMN_COUNT}>
            <Status
              status={isFiltered ? "no-matches" : "empty"}
              title={isFiltered ? t`No Matching Share Networks` : t`No Share Networks Found`}
              body={isFiltered ? t`No share networks match your search` : t`No share networks in this project`}
            />
          </DataGridCell>
        </DataGridRow>
      ) : (
        shareNetworks.map((network) => <ShareNetworkTableRow key={network.id} shareNetwork={network} />)
      )}
    </DataGrid>
  )
}
