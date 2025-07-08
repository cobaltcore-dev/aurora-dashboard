import React from "react"
import { Modal, Button, ModalFooter, ButtonRow, Message } from "@cloudoperators/juno-ui-components"

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
  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(clusterName)
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      size="small"
      title="Delete Cluster"
      onConfirm={(e) => {
        handleDelete(e)
        onClose()
      }}
      cancelButtonLabel="Cancel"
      confirmButtonLabel="Delete Cluster"
      modalFooter={
        <ModalFooter className="flex justify-end gap-3 px-8 mt-8">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                onClose()
                handleDelete(e)
              }}
            >
              Delete
            </Button>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
      children={
        <div className="flex items-center justify-center">
          <div className="rounded-lg shadow-2xl w-full max-w-md overflow-y-auto">
            <div className="space-y-8">
              {/* Content */}
              <div className="px-8 space-y-6">
                {/* Warning */}
                <Message dismissible={false} variant="warning">
                  This action cannot be undone. The cluster will be permanently deleted.
                </Message>

                {/* Question */}
                <p className="text-juno-grey-light text-base text-left">
                  Would you like to remove the{" "}
                  <strong className="text-juno-grey-light-7 font-semibold">{clusterName}</strong> from your project?
                </p>

                {/* Consequence */}
                <p className="text-juno-grey-light text-base text-left">
                  After continuing, your project will no longer have access to the{" "}
                  <strong className="text-juno-light font-semibold">{clusterName}</strong> resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    ></Modal>
  )
}
