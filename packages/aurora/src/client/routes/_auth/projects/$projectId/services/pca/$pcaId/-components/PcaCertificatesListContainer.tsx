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
import { CertificateAuthority } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { PcaCertificatesTableRow } from "./-table/PcaCertificatesTableRow"
import { IssueEndEntityCertificateModal } from "./-modals/IssueEndEntityCertificateModal"

const ITEMS_PER_PAGE = 50

interface PcaCertificatesListContainerProps {
  pcaId: string
  pcaState: CertificateAuthority["state"]
}

export const PcaCertificatesListContainer = ({ pcaId, pcaState }: PcaCertificatesListContainerProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [createIssueEndEntityOpen, toggleIssueEndEntity] = useModal(false)
  const [pageMarkers, setPageMarkers] = useState<(string | undefined)[]>([undefined])
  const [currentPage, setCurrentPage] = useState(1)

  const columns = () =>
    [
      t`CA ID`,
      t`ID`,
      "", // empty column for item-action with context menu containing "Delete CA" button
    ] as const
  const columnsLength = columns().length

  const currentMarker = pageMarkers[currentPage - 1]

  const { data, isLoading, isError, error } = trpcReact.services.pca.listCertificates.useQuery({
    project_id: projectId,
    certificate_authority_id: pcaId,
    limit: ITEMS_PER_PAGE,
    next_page_marker: currentMarker,
  })

  const certificates = data?.certificates ?? []
  const nextMarker = data?.next_page_marker
  const hasNextPage = !!nextMarker
  const computedTotal = hasNextPage ? currentPage + 1 : currentPage
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
        <Trans>Loading Certificates issued by Certificate Authority...</Trans>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {error?.message ?? t`Failed to load Certificates issued by Certificate Authority.`}
      </Stack>
    )
  }

  return (
    <div className="relative">
      {pcaState === "READY" && (
        <>
          <Stack className="pt-3 pb-2" distribution="end">
            <Button variant="primary" label={t`Issue End-Entity Certificate`} onClick={toggleIssueEndEntity} />
          </Stack>
          {createIssueEndEntityOpen && (
            <IssueEndEntityCertificateModal
              open={createIssueEndEntityOpen}
              onClose={toggleIssueEndEntity}
              pcaId={pcaId}
            />
          )}
        </>
      )}

      {certificates.length === 0 && currentPage === 1 ? (
        <DataGrid columns={columnsLength} className="pca-certificates" data-testid="no-pcas-certificates">
          <DataGridRow>
            <DataGridCell colSpan={columnsLength}>
              <ContentHeading>
                <Trans>No Certificates issued by this Certificate Authority found</Trans>
              </ContentHeading>
              <p>
                <Trans>There are no Certificates available for this Certificate Authority.</Trans>
              </p>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      ) : (
        <DataGrid columns={columnsLength}>
          <DataGridRow>
            {columns().map((label) => (
              <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
            ))}
          </DataGridRow>
          {certificates.map((certificate) => (
            <PcaCertificatesTableRow key={certificate.id} certificate={certificate} />
          ))}
        </DataGrid>
      )}

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
    </div>
  )
}
