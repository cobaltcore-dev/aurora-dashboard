import { Fragment } from "react"
import { MdDownload, MdContentCopy } from "react-icons/md"
import { useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  DescriptionDefinition,
  DescriptionList,
  DescriptionTerm,
  Divider,
  Stack,
} from "@cloudoperators/juno-ui-components/index"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { useProjectId } from "@/client/hooks"
import { useModal } from "@/client/utils/useModal"
import { DeletePcaModal } from "../../-components/-modals/DeletePcaModal"
import { STATE_CONFIG } from "../../-components/-table/constants"
import { PcaCertificatesListContainer } from "./PcaCertificatesListContainer"
import { IssueSelfSignedCertificateModal } from "./-modals/IssueSelfSignedCertificateModal"
// import { ImportExternallySignedCertificateModal } from "./ImportExternallySignedCertificateModal"

interface PcaDetailsViewProps {
  pca: CertificateAuthority
}

export const PcaDetailsView = ({ pca }: PcaDetailsViewProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [issueSelfSignedModalOpen, toggleIssueSelfSignedModal] = useModal(false)
  // I will enable this modal on import-certificate task of the EPIC
  // const [importExternallySignedModalOpen, toggleImportExternallySignedModal] = useModal(false)
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
            {/* temporary bg, I will resolve this as soon as I will have sync with designers */}
            <div className="bg-aurora-blue-200 flex items-center gap-1 rounded-sm px-1 py-0.5">
              {STATE_CONFIG[pca.state].icon} {STATE_CONFIG[pca.state].text}
            </div>
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
              <div className="text-base font-bold">Lifecycle action</div>
              <div>Add a Signed Certificate to your CA to activate it</div>
            </Stack>
            <Stack direction="horizontal" gap="2" distribution="end">
              <Button onClick={toggleIssueSelfSignedModal}>Issue Self-Signed Certificate</Button>
              {/* <Button onClick={toggleImportExternallySignedModal}>Import Signed Certificate</Button> */}
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

          <div className="bg-dt-background w-full rounded-sm">
            <div className="text-theme-default p-4 text-xl font-bold">
              Certificate {`${pca.configuration?.subject?.common_name}`}
            </div>
            <Divider />

            <div className="p-4 text-sm break-all whitespace-pre-wrap">{pca?.csr}</div>

            {/* I will implement downloading-copying functionality at issue/import part of the epic as I need to clarify some stuff with design-clavis team */}
            <Divider />
            <Stack gap="2" distribution="end" className="p-4">
              <Button>
                <MdDownload />
              </Button>
              <Button>
                <MdContentCopy />
              </Button>
            </Stack>
          </div>
        </Stack>
      </Stack>

      {/* {importExternallySignedModalOpen && (
        <ImportExternallySignedCertificateModal
          pcaId={pca.id}
          open={importExternallySignedModalOpen}
          onClose={toggleImportExternallySignedModal}
        />
      )} */}

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
