import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Checkbox } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface EnableVersioningModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const EnableVersioningModal = ({
  isOpen,
  bucketName,
  onClose,
  onSuccess,
  onError,
}: EnableVersioningModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmed, setConfirmed] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.versioning.enable",
  })

  const utils = trpcReact.useUtils()

  const enableMutation = trpcReact.storage.ceph.versioning.setStatus.useMutation({
    onSuccess: () => {
      utils.storage.ceph.versioning.getStatus.invalidate()
      onSuccess?.(bucketName)
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    trackClose()
    setConfirmed(false)
    enableMutation.reset()
    resetTracking()
    onClose()
  }

  const handleEnable = () => {
    if (!confirmed) return

    markSubmitted()
    enableMutation.mutate({
      project_id: projectId,
      bucket: bucketName,
      status: "Enabled",
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Enable Versioning`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Enable Versioning`}
      onConfirm={handleEnable}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!confirmed || enableMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <p>
          <Trans>
            Once enabled, versioning cannot be fully disabled, it can only be suspended. Existing versions will remain
            even after suspension.
          </Trans>
        </p>

        <Checkbox
          checked={confirmed}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)}
          label={t`I understand that enabling versioning is permanent`}
          disabled={enableMutation.isPending}
        />
      </Stack>
    </Modal>
  )
}
