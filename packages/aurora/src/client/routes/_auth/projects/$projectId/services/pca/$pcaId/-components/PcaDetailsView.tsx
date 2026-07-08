import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { Badge, Button, Stack } from "@cloudoperators/juno-ui-components/index"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { DeletePcaModal } from "../../-components/-modals/DeletePcaModal"
import { IssueSelfSignedCertificateModal } from "./-modals/IssueSelfSignedCertificateModal"
import { ImportExternallySignedCertificateModal } from "./-modals/ImportExternallySignedCertificateModal"
import { PcaCertificatesListContainer } from "./-table/PcaCertificatesListContainer"
import { DetailsInfo } from "./DetailsInfo"

interface PcaDetailsViewProps {
  pca: CertificateAuthority
}

export const PcaDetailsView = ({ pca }: PcaDetailsViewProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [issueSelfSignedModalOpen, toggleIssueSelfSignedModal] = useModal(false)
  const [importExternallySignedModalOpen, toggleImportExternallySignedModal] = useModal(false)
  const [deletePcaModalOpen, toggleDeletePcaModal] = useModal(false)

  const navigateToPcaList = () =>
    navigate({
      to: "/projects/$projectId/services/pca",
      params: { projectId },
    })

  const BASIC_INFO = [
    { label: t`CA ID`, value: pca.id },
    { label: t`Project ID`, value: pca.project_id },
    { label: t`Subject`, value: pca.display_subject },
    {
      label: t`Duration/validity`,
      value:
        pca.certificate?.validity.not_before !== undefined && pca.certificate?.validity.not_after !== undefined
          ? `${Math.round(
              (pca.certificate.validity.not_after - pca.certificate.validity.not_before) / (60 * 60 * 24)
            )} days`
          : undefined,
    },
  ] as const

  const STATE_CONFIG = {
    CREATING: <Badge icon="bolt" variant="info" text={t`Creating`} />,
    AWAITING_CERTIFICATE: <Badge icon="accessTime" variant="warning" text={t`Awaiting Certificate`} />,
    READY: <Badge icon="checkCircle" variant="success" text={t`Ready`} />,
    FAILED: <Badge icon="error" variant="error" text={t`Failed`} />,
    UNEXPECTED: <Badge icon="severityUnknown" variant="default" text={t`Unexpected`} />,
  } as const

  return (
    <>
      <Stack direction="vertical" gap="3">
        <Stack direction="horizontal" distribution="between">
          <Stack gap="2" alignment="center">
            <div className="text-theme-default text-2xl font-semibold">
              {`${pca.configuration?.subject?.named_attributes?.cn} Certificate Authority Details`}
            </div>
            {STATE_CONFIG[pca.state]}
          </Stack>
          <Button onClick={toggleDeletePcaModal}>
            <Trans>Delete Certificate Authority</Trans>
          </Button>
        </Stack>

        <p className="text-theme-highest text-sm">
          <Trans>Manage your Private Certificate Authority infrastructure</Trans>
        </p>

        {pca.state === "AWAITING_CERTIFICATE" && (
          <Stack direction="vertical" gap="1" className="bg-dt-background mb-1 rounded-sm p-2">
            <Stack direction="vertical" gap="1">
              <div className="text-base font-bold">
                <Trans>Lifecycle action</Trans>
              </div>
              <div>
                <Trans>Add a Signed Certificate to your CA to activate it</Trans>
              </div>
            </Stack>
            <Stack direction="horizontal" gap="2" distribution="end">
              <Button onClick={toggleIssueSelfSignedModal}>
                <Trans>Issue Self-Signed Certificate</Trans>
              </Button>
              <Button onClick={toggleImportExternallySignedModal}>
                <Trans>Import Signed Certificate</Trans>
              </Button>
            </Stack>
          </Stack>
        )}

        <DetailsInfo
          basicInfo={BASIC_INFO}
          heading={`Certificate ${pca.configuration?.subject?.named_attributes?.cn}`}
          content={pca?.csr ?? ""}
        />
      </Stack>

      {importExternallySignedModalOpen && (
        <ImportExternallySignedCertificateModal
          pcaId={pca.id}
          open={importExternallySignedModalOpen}
          onClose={toggleImportExternallySignedModal}
        />
      )}

      {issueSelfSignedModalOpen && (
        <IssueSelfSignedCertificateModal
          pca={pca}
          open={issueSelfSignedModalOpen}
          onClose={toggleIssueSelfSignedModal}
        />
      )}

      {deletePcaModalOpen && (
        <DeletePcaModal
          pca={pca}
          open={deletePcaModalOpen}
          onClose={toggleDeletePcaModal}
          onSuccess={navigateToPcaList}
        />
      )}

      <PcaCertificatesListContainer pcaId={pca.id} pcaState={pca.state} />
    </>
  )
}
