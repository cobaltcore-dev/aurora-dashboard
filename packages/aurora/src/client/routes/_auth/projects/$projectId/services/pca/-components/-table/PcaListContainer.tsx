import { Trans, useLingui } from "@lingui/react/macro"
import { useState } from "react"
import {
  Stack,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  DataGridHeadCell,
  Button,
  Pagination,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { PcaTableRow } from "./PcaTableRow"
import { CreatePcaModal } from "../-modals/CreatePcaModal"

const ITEMS_PER_PAGE = 50

export const PcaListContainer = () => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [createCaOpen, toggleCreateCa] = useModal(false)
  const [pageMarkers, setPageMarkers] = useState<(string | undefined)[]>([undefined])
  const [currentPage, setCurrentPage] = useState(1)
  const currentMarker = pageMarkers[currentPage - 1]

  const { data, isLoading, isError, error } = trpcReact.services.pca.list.useQuery({
    project_id: projectId,
    limit: ITEMS_PER_PAGE,
    next_page_marker: currentMarker,
  })

  const pcas = data?.certificate_authorities ?? []
  const nextMarker = data?.next_page_marker
  const computedTotal = nextMarker ? currentPage + 1 : currentPage
  const totalPages = Math.max(computedTotal, pageMarkers.length)

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    if (page > currentPage && nextMarker) {
      setPageMarkers((prev) => {
        const updated = [...prev]
        updated[page - 1] = nextMarker
        return updated
      })
    }
    setCurrentPage(page)
  }

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
        {error?.message ?? t`Failed to load PCAs`}
      </Stack>
    )
  }

  const TABLE_COLUMNS = [
    t`State`,
    t`ID`,
    t`Subject information`,
    "", // empty column for item-action with context menu containing "Delete CA" button
  ] as const
  const columnsLength = TABLE_COLUMNS.length

  return (
    <div className="relative">
      <Stack className="pt-3 pb-2" distribution="end">
        <Button variant="primary" label={t`Create Certificate Authority`} onClick={toggleCreateCa} />
      </Stack>

      {pcas.length === 0 && currentPage === 1 ? (
        <DataGrid columns={columnsLength} className="pca" data-testid="no-pcas">
          <DataGridRow>
            <DataGridCell colSpan={columnsLength}>
              <ContentHeading>
                <Trans>No PCAs found</Trans>
              </ContentHeading>
              <p>
                <Trans>There are no PCAs available for this project.</Trans>
              </p>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      ) : (
        <>
          <DataGrid columns={columnsLength}>
            <DataGridRow>
              {TABLE_COLUMNS.map((label) => (
                <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
              ))}
            </DataGridRow>
            {pcas.map((pca) => (
              <PcaTableRow key={pca.id} pca={pca} />
            ))}
          </DataGrid>

          {totalPages > 1 && (
            <div className="flex justify-center py-4">
              <Pagination
                variant="input"
                currentPage={currentPage}
                pages={totalPages}
                onPressPrevious={() => goToPage(currentPage - 1)}
                onPressNext={() => goToPage(currentPage + 1)}
              />
            </div>
          )}
        </>
      )}

      {createCaOpen && <CreatePcaModal open={createCaOpen} onClose={toggleCreateCa} />}
    </div>
  )
}
