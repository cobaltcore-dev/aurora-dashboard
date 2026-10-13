import { useEffect, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Status,
  Pagination,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { NetworkTableRow } from "./NetworkTableRow"

const COLUMN_COUNT = 8

interface NetworkListContainerProps {
  networks?: NetworkListItem[]
  /** Whether a search term or filter is applied, to tell "no matches" apart from "no networks in this project" */
  isFiltered?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export const NetworkListContainer = ({
  networks,
  isFiltered = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: NetworkListContainerProps) => {
  const { t } = useLingui()
  const [inputPage, setInputPage] = useState<string>(currentPage.toString())

  useEffect(() => {
    setInputPage(currentPage.toString())
  }, [currentPage])

  const updateCurrentPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange?.(newPage)
      setInputPage(newPage.toString())
    }
  }

  return (
    <>
      {/* Top-aligned cells keep rows scannable when a network has several subnets */}
      <DataGrid
        columns={COLUMN_COUNT}
        minContentColumns={[7]}
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
          <DataGridHeadCell>
            <Trans>MTU</Trans>
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
      {totalPages > 1 && (
        <Stack distribution="center" className="py-4">
          <Pagination
            variant="input"
            currentPage={currentPage}
            pages={totalPages}
            onPressPrevious={() => updateCurrentPage(Math.max(currentPage - 1, 1))}
            onPressNext={() => updateCurrentPage(Math.min(currentPage + 1, totalPages))}
            onSelectChange={(selectedPage: number) => {
              updateCurrentPage(selectedPage)
            }}
            onInputChange={(newInputPage?: number) => {
              setInputPage(newInputPage === undefined ? "" : String(newInputPage))
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && inputPage !== "") {
                const newPage = parseInt(inputPage, 10)
                if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                  updateCurrentPage(newPage)
                }
              }
            }}
          />
        </Stack>
      )}
    </>
  )
}
