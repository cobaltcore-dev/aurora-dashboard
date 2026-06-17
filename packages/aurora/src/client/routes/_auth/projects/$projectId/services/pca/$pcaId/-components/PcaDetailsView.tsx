import { Fragment } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  CodeBlock,
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Stack,
} from "@cloudoperators/juno-ui-components/index"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { DeletePcaModal } from "../../-components/-modals/DeletePcaModal"
import { STATE_CONFIG } from "../../-components/-table/constants"
import { PcaCertificatesListContainer } from "./PcaCertificatesListContainer"
import { IssueSelfSignedCertificateModal } from "./-modals/IssueSelfSignedCertificateModal"
import { ImportExternallySignedCertificateModal } from "./-modals/ImportExternallySignedCertificateModal"

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

  const basicInfo = [
    { label: t`CA ID`, value: pca.id },
    { label: t`Project ID`, value: pca.project_id },
    { label: t`Subject`, value: pca.configuration?.subject?.common_name },
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

  return (
    <>
      <Stack direction="vertical" gap="3">
        <Stack direction="horizontal" distribution="between">
          <Stack gap="2" alignment="center">
            <div className="text-theme-default text-2xl font-semibold">
              {`${pca.configuration?.subject?.common_name} Certificate Authority Details`}
            </div>
            {STATE_CONFIG[pca.state].badge}
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

        <Stack gap="4" className="grid grid-cols-2 items-start">
          <DescriptionList alignTerms="right" className="w-full">
            {basicInfo.map(({ label, value }) => (
              <Fragment key={label}>
                <DescriptionTerm>{label}</DescriptionTerm>
                <DescriptionDefinition>{value || "—"}</DescriptionDefinition>
              </Fragment>
            ))}
          </DescriptionList>

          <CodeBlock
            heading={`Certificate ${pca.configuration?.subject?.common_name ?? ""}`}
            content={pca?.csr ?? ""}
            className="w-full [&_pre_code]:block [&_pre_code]:w-full"
            wrap
          />
        </Stack>
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
