import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"

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
      onClose()
    },
  })

  const handleSuspend = () => {
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
      onCancel={onClose}
      confirmButtonLabel={t`Suspend Versioning`}
      onConfirm={handleSuspend}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={suspendMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        <Message variant="info" title={t`Suspending Versioning`}>
          <Trans>
            Suspending versioning will stop creating new versions for future uploads. All existing versions will be
            preserved.
          </Trans>
        </Message>

        <Message variant="warning" title={t`Storage Implications`}>
          <Trans>
            Existing versions will continue to use storage space. To free space, you must manually delete old versions.
          </Trans>
        </Message>

        <div>
          <h4 className="mb-2 font-semibold">
            <Trans>What happens when suspended:</Trans>
          </h4>
          <ul className="list-disc space-y-1 pl-5">
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
