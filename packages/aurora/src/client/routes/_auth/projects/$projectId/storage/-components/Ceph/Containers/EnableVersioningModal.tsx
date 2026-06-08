import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Message, Checkbox } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"

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
    setConfirmed(false)
    enableMutation.reset()
    onClose()
  }

  const handleEnable = () => {
    if (!confirmed) return

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
        <Message variant="info" title={t`What is versioning?`}>
          <Trans>
            Versioning allows you to keep multiple variants of an object in the same bucket. This protects against
            accidental overwrites and deletions.
          </Trans>
        </Message>

        <Message variant="warning" title={t`Important`}>
          <Trans>
            Once enabled, versioning cannot be fully disabled—it can only be suspended. Existing versions will remain
            even after suspension.
          </Trans>
        </Message>

        <div>
          <h4 className="mb-2 font-semibold">
            <Trans>Benefits:</Trans>
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Trans>Recover from accidental deletions</Trans>
            </li>
            <li>
              <Trans>Retrieve older versions of objects</Trans>
            </li>
            <li>
              <Trans>Maintain object history</Trans>
            </li>
          </ul>
        </div>

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
