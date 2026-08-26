import React from "react"
import { Modal, Stack, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

interface DeleteSecurityGroupDialogProps {
  isOpen: boolean
  securityGroup: SecurityGroup
  onClose: () => void
  onDelete: (securityGroupId: string) => void
  isDeleting?: boolean
  error?: string | null
}

export const DeleteSecurityGroupDialog: React.FC<DeleteSecurityGroupDialogProps> = ({
  isOpen,
  onClose,
  securityGroup,
  onDelete,
  isDeleting = false,
  error = null,
}) => {
  const { t } = useLingui()

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen,
    confirmWord: "delete",
    trackingPrefix: "network.securitygroup",
  })

  const securityGroupName = securityGroup.name || securityGroup.id

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    if (isConfirmed && !isDeleting) {
      markSubmitted()
      onDelete(securityGroup.id)
    }
  }

  const handleClose = () => {
    trackClose()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group "${securityGroupName}"`}
      confirmButtonLabel={isDeleting ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmed || isDeleting}
      disableCancelButton={isDeleting}
      disableCloseButton={isDeleting}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>This action cannot be undone. The security group will be permanently deleted.</Trans>
        </p>

        <TextInput
          label={t`Type "delete" to confirm`}
          id="confirmation"
          name="confirmation"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          disabled={isDeleting}
          autoComplete="off"
          autoFocus
          data-testid="delete-confirmation-input"
        />
      </Stack>
    </Modal>
  )
}
