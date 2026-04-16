import React, { useState } from "react"
import { Modal, Button, ModalFooter, ButtonRow, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

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
  const [confirmationText, setConfirmationText] = useState("")

  const deleteWord = t`delete`
  const isDeleteEnabled = confirmationText.toLowerCase() === deleteWord.toLowerCase()
  const securityGroupName = securityGroup.name || securityGroup.id

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    if (isDeleteEnabled && !isDeleting) {
      onDelete(securityGroup.id)
    }
  }

  const handleClose = () => {
    setConfirmationText("")
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button variant="default" onClick={handleClose} disabled={isDeleting}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary-danger"
              onClick={handleDelete}
              disabled={!isDeleteEnabled || isDeleting}
              data-testid="confirm-delete-button"
            >
              {isDeleting ? <Trans>Deleting...</Trans> : <Trans>Delete</Trans>}
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      <div>
        {/* Warning */}
        <Trans>This action cannot be undone. The security group will be permanently deleted.</Trans>

        {/* Error Message */}
        {error && (
          <Message dismissible={false} variant="error" className="mt-4">
            {error}
          </Message>
        )}

        {/* Question */}
        <p className="mt-4">
          <Trans>
            Would you like to remove the security group{" "}
            <strong className="text-theme-high font-semibold">{securityGroupName}</strong> from your project?
          </Trans>
        </p>

        {/* Consequence */}
        <p className="mb-4">
          <Trans>
            After continuing, your project will no longer have access to the security group and any rules associated
            with it.
          </Trans>
        </p>

        {/* In-use warning */}
        <Trans>
          Note: If this security group is currently in use by one or more ports, the deletion will fail. Please ensure
          no resources are using this security group before attempting to delete it.
        </Trans>

        {/* Confirmation Input */}
        <div className="mt-4">
          <p className="mb-2 text-sm">
            <Trans>
              Type <strong>{deleteWord}</strong> to confirm:
            </Trans>
          </p>
          <TextInput
            id="confirmation"
            name="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={deleteWord}
            disabled={isDeleting}
            autoComplete="off"
            data-testid="delete-confirmation-input"
          />
        </div>
      </div>
    </Modal>
  )
}
