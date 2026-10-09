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
import type { PortListItem } from "@/server/Network/types/port"
import { PortTableRow } from "./PortTableRow"

interface PortListContainerProps {
  ports?: PortListItem[]
  /** Whether a search term is applied, to tell "no matches" apart from "no ports in this project" */
  hasSearch?: boolean
  /** List scoped to one network: hides the Network column, which would repeat the same network in every row */
  isNetworkScoped?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export const PortListContainer = ({
  ports,
  hasSearch = false,
  isNetworkScoped = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: PortListContainerProps) => {
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

  const columns = isNetworkScoped ? 6 : 7

  const getEmptyStateBody = () => {
    if (hasSearch) return t`No ports match your search. Clear the search to view all ports.`
    return isNetworkScoped ? t`There are no ports on this network.` : t`There are no ports in this project.`
  }

  return (
    <>
      {/* Top-aligned cells keep rows scannable when a column lists multiple items (e.g. IPv4 and IPv6 fixed IPs) */}
      <DataGrid
        columns={columns}
        minContentColumns={[columns - 1]}
        cellVerticalAlignment="top"
        className="ports"
        data-testid="ports-table"
      >
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name / ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Description</Trans>
          </DataGridHeadCell>
          {!isNetworkScoped && (
            <DataGridHeadCell>
              <Trans>Network</Trans>
            </DataGridHeadCell>
          )}
          <DataGridHeadCell>
            <Trans>Fixed IPs / Subnet</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Device Owner / ID</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Status</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {ports && ports.length > 0 ? (
          ports.map((port) => <PortTableRow key={port.id} port={port} showNetwork={!isNetworkScoped} />)
        ) : (
          <DataGridRow>
            <DataGridCell colSpan={columns}>
              <Status status="empty" title={t`No Ports Found`} body={getEmptyStateBody()} />
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
