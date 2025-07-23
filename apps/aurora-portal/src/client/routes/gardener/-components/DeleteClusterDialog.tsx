import React from "react"
import { Modal, Button, ModalFooter, ButtonRow, Message } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"

interface DeleteClusterGardenerDialogProps {
  isOpen: boolean
  clusterName: string
  onClose: () => void
  onDelete: (clusterName: string) => void
}

export const DeleteClusterDialog: React.FC<DeleteClusterGardenerDialogProps> = ({
  isOpen,
  onClose,
  clusterName,
  onDelete,
}) => {
  const { t } = useLingui()
  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(clusterName)
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      size="small"
      title={t`Delete Cluster`}
      onConfirm={(e) => {
        handleDelete(e)
        onClose()
      }}
      modalFooter={
        <ModalFooter className="flex justify-end ">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                onClose()
                handleDelete(e)
              }}
            >
              <Trans>Delete</Trans>
            </Button>
            <Button variant="default" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      <div>
        {/* Warning */}
        <Message dismissible={false} variant="warning">
          <Trans>This action cannot be undone. The cluster will be permanently deleted.</Trans>
        </Message>

        {/* Question */}
        <p className="mt-4">
          <Trans>
            Would you like to remove the <strong className="text-theme-high font-semibold">{clusterName}</strong> from
            your project?
          </Trans>
        </p>

        {/* Consequence */}
        <p>
          <Trans>
            After continuing, your project will no longer have access to the{" "}
            <strong className="text-theme-high font-semibold">{clusterName}</strong> resources.
          </Trans>
        </p>
      </div>
    </Modal>
  )
}
