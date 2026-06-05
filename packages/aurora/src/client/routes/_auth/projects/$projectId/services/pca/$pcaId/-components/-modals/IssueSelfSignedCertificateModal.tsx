import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { CertificateAuthority } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"

const VALIDITY_SECONDS = 86400 // 1 day

export interface IssueSelfSignedCertificateModalProps {
  open: boolean
  onClose: () => void
  pca: CertificateAuthority
}

export const IssueSelfSignedCertificateModal = ({ open, onClose, pca }: IssueSelfSignedCertificateModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { isPending, ...createCertificateMutation } = trpcReact.services.pca.createCertificate.useMutation({
    onSettled: () => utils.services.pca.listCertificates.invalidate(),
  })

  const handleConfirm = async () => {
    if (isPending || !pca.csr) return

    await createCertificateMutation.mutateAsync({
      project_id: projectId,
      certificate_authority_id: pca.id,
      csr: pca.csr,
      configuration: {
        validity: {
          not_after: Math.floor(Date.now() / 1000) + VALIDITY_SECONDS,
        },
      },
    })
    onClose()
  }

  const handleClose = () => {
    if (isPending) return

    createCertificateMutation.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t`Issue Self Signed Certificate`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Issue Certificate`}
      onConfirm={handleConfirm}
      disableConfirmButton={isPending || !pca.csr}
    >
      {createCertificateMutation.error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {createCertificateMutation.error?.message}
        </Message>
      )}

      {isPending ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Issuing Self-Signed Certificate...</Trans>
          </span>
        </div>
      ) : (
        <Trans>This action will create a self-signed CA certificate.</Trans>
      )}
    </Modal>
  )
}
