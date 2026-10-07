import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Stack } from "@cloudoperators/juno-ui-components"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteCredentialModalProps {
  isOpen: boolean
  accessKey: string
  isLastKey: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation step for deleting an S3 access key, stacked on top of `ManageCredentialsModal`.
 *
 * Rendered inside the parent `Modal`'s own subtree, the way `ObjectVersionHistoryModal` stacks
 * `DeleteVersionModal`/`RestoreVersionModal` over itself - the one existing modal-over-modal in
 * the dashboard, and the pattern this follows rather than inventing a second one.
 *
 * Purely a confirmation: the mutation, its invalidation, the row spinner and the toast all stay in
 * `ManageCredentialsModal`, so there is still exactly one place that deletes a credential.
 * Confirming closes this modal and the parent takes it from there, which is also what keeps the
 * in-flight spinner visible in the row instead of behind a second dialog.
 *
 * No type-the-word-to-confirm box, unlike `DeleteVersionModal` and `DeleteBucketModal`: an access
 * key ID is a 40-character hex string nobody is going to retype, and the damage is recoverable by
 * creating another key - a bucket or an object version is not.
 *
 * Deleting the last key is a bigger step than deleting one of several and gets said so. Without a
 * key the BFF cannot sign a single Ceph request, so S3 Object Storage goes out of reach inside the
 * dashboard too, not just from outside clients - the bucket list behind this modal falls back to
 * its `NO_CEPH_CREDENTIALS` empty state. Nothing stored is lost, and a new key reaches the same
 * buckets because all of a user's keys in a project map to one RGW identity, which is the half of
 * it worth saying in the same breath.
 *
 * Tracked in its own right, like every other confirmation dialog under `Ceph/`, and under its own
 * `actionPrefix`: the parent already reports opening and closing the management modal, which says
 * nothing about how often a delete is started and then thought better of. `markSubmitted` fires on
 * confirm even though the mutation belongs to the parent - what this dialog can report is that it
 * was answered yes, not how that turned out.
 *
 * Said as prose, not as a `Message` banner: every confirmation dialog in the dashboard states its
 * consequences in plain paragraphs (DeleteBucketModal, DeleteBucketPolicyModal,
 * DeleteLifecycleRuleModal, EmptyBucketModal), and a `Message` inside one of them means a failure
 * that just happened, not a standing warning about what the button will do.
 */
export const DeleteCredentialModal = ({
  isOpen,
  accessKey,
  isLastKey,
  onConfirm,
  onCancel,
}: DeleteCredentialModalProps) => {
  const { t } = useLingui()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.credentials.delete",
  })

  const handleCancel = () => {
    trackClose()
    resetTracking()
    onCancel()
  }

  const handleConfirm = () => {
    markSubmitted()
    resetTracking()
    onConfirm()
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Delete Access Key`}
      open={isOpen}
      size="small"
      onCancel={handleCancel}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Delete Access Key`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
          <Trans>
            Access key <strong className="font-mono">{accessKey}</strong> will be permanently deleted.
          </Trans>
        </p>
        <p className="text-theme-default">
          <Trans>
            It stops working immediately: any S3 client still configured with it loses access. The key cannot be
            restored - a replacement is a new key, with a new secret.
          </Trans>
        </p>

        {isLastKey && (
          <p className="text-theme-default">
            <Trans>
              This is the last access key in this project. Without one, S3 Object Storage is out of reach here in the
              dashboard as well as from any S3 client. The buckets and their contents are not deleted, and creating a
              new key restores access to them.
            </Trans>
          </p>
        )}
      </Stack>
    </Modal>
  )
}
