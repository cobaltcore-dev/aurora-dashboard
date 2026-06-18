import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridCell,
  ContentHeading,
  DataGridHeadCell,
  Button,
} from "@cloudoperators/juno-ui-components"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { PcaCertificatesTableRow } from "./-table/PcaCertificatesTableRow"
import { IssueEndEntityCertificateModal } from "./-modals/IssueEndEntityCertificateModal"

interface PcaCertificatesListContainerProps {
  pcaId: string
  pcaState: CertificateAuthority["state"]
}

export const PcaCertificatesListContainer = ({ pcaId, pcaState }: PcaCertificatesListContainerProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [createIssueEndEntityOpen, toggleIssueEndEntity] = useModal(false)

  const columns = () =>
    [
      t`CA ID`,
      t`ID`,
      "", // empty column for item-action with context menu containing "Delete CA" button
    ] as const
  const columnsLength = columns().length

  const {
    data: pcaCertificates = [],
    isLoading,
    isError,
    error,
  } = trpcReact.services.pca.listCertificates.useQuery({
    project_id: projectId,
    certificate_authority_id: pcaId,
  })

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

      {pcaCertificates.length === 0 ? (
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
          {pcaCertificates.map((certificate) => (
            <PcaCertificatesTableRow key={certificate.id} certificate={certificate} />
          ))}
        </DataGrid>
      )}
    </div>
  )
}
