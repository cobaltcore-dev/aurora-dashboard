import {
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Status,
  Pagination,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useEffect, useState } from "react"
import type { RouterListItem } from "@/server/Network/types/router"
import { RouterTableRow } from "./RouterTableRow"

interface RouterListContainerProps {
  routers?: RouterListItem[]
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export const RouterListContainer = ({
  routers,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: RouterListContainerProps) => {
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
      {/* Top-aligned cells keep rows scannable when a column lists multiple items (e.g. external subnets) */}
      <DataGrid
        columns={6}
        minContentColumns={[5]}
        cellVerticalAlignment="top"
        className="routers"
        data-testid="routers-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>External Network</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>External Subnet</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Private Network</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {routers && routers.length > 0 ? (
          routers.map((router) => <RouterTableRow key={router.id} router={router} />)
        ) : (
          <DataGridRow>
            <DataGridCell colSpan={6}>
              <Status
                status="empty"
                title={t`No routers found`}
                body={t`There are no routers available for this project with the current filters applied. Try adjusting your filter criteria.`}
              />
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
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
        </div>
      )}
    </>
  )
}
