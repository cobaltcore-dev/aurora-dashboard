import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface SuspendVersioningModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const SuspendVersioningModal = ({
  isOpen,
  bucketName,
  onClose,
  onSuccess,
  onError,
}: SuspendVersioningModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.versioning.suspend",
  })

  const utils = trpcReact.useUtils()

  const suspendMutation = trpcReact.storage.ceph.versioning.setStatus.useMutation({
    onSuccess: () => {
      utils.storage.ceph.versioning.getStatus.invalidate()
      onSuccess?.(bucketName)
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
    onSettled: () => {
      suspendMutation.reset()
      resetTracking()
      onClose()
    },
  })

  const handleClose = () => {
    trackClose()
    resetTracking()
    onClose()
  }

  const handleSuspend = () => {
    markSubmitted()
    suspendMutation.mutate({
      project_id: projectId,
      bucket: bucketName,
      status: "Suspended",
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Suspend Versioning`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Suspend Versioning`}
      onConfirm={handleSuspend}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={suspendMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <div>
          <p className="mb-2 text-sm font-semibold">
            <Trans>What happens when suspended:</Trans>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <Trans>New uploads will overwrite the current version</Trans>
            </li>
            <li>
              <Trans>No new versions will be created</Trans>
            </li>
            <li>
              <Trans>Existing versions remain accessible</Trans>
            </li>
            <li>
              <Trans>You can re-enable versioning at any time</Trans>
            </li>
          </ul>
        </div>
      </Stack>
    </Modal>
  )
}
