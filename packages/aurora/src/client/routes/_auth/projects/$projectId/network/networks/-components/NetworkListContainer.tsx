import { Trans, useLingui } from "@lingui/react/macro"
import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { NetworkTableRow } from "./NetworkTableRow"

const COLUMN_COUNT = 7

interface NetworkListContainerProps {
  networks?: NetworkListItem[]
  /** Whether a search term or filter is applied, to tell "no matches" apart from "no networks in this project" */
  isFiltered?: boolean
}

export const NetworkListContainer = ({ networks, isFiltered = false }: NetworkListContainerProps) => {
  const { t } = useLingui()

  return (
    <>
      {/* Top-aligned cells keep rows scannable when a network has several subnets */}
      <DataGrid
        columns={COLUMN_COUNT}
        minContentColumns={[6]}
        cellVerticalAlignment="top"
        className="networks"
        data-testid="networks-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Admin State</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Subnets</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Shared</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>External</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {networks && networks.length > 0 ? (
          networks.map((network) => <NetworkTableRow key={network.id} network={network} />)
        ) : (
          <DataGridRow>
            <DataGridCell colSpan={COLUMN_COUNT}>
              <Status
                status="empty"
                title={t`No Networks Found`}
                body={
                  isFiltered
                    ? t`No networks match your search or filters. Clear them to view all networks.`
                    : t`There are no networks in this project.`
                }
              />
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
    </>
  )
}
