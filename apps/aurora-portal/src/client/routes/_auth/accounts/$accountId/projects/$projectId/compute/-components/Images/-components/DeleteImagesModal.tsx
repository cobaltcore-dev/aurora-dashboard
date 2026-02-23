import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ButtonRow, Message, Modal, ModalFooter, Spinner, Stack } from "@cloudoperators/juno-ui-components"

interface DeleteImagesModalProps {
  deletableImages: Array<string>
  protectedImages: Array<string>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onDelete: (deletableImages: Array<string>) => void
}

export const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
  deletableImages,
  protectedImages,
  isOpen,
  isLoading,
  onClose,
  onDelete,
}) => {
  const { t } = useLingui()

  const deletableCount = deletableImages.length
  const protectedCount = protectedImages.length

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDelete(deletableImages)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Delete Images`}
      open={isOpen}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                handleDelete(e)
                onClose()
              }}
              disabled={isLoading}
              data-testid={`delete-image-button`}
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Delete</Trans>}
            </Button>
            <Button variant="default" onClick={onClose}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      {isLoading && (
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      )}

      {!isLoading && (
        <div className="my-6">
          {deletableCount > 0 && (
            <>
              {/* Header */}
              <Message
                text={t`You are about to delete ${deletableCount} image(s). This action cannot be undone.`}
                variant="warning"
                className="mb-6"
              />

              {/* Images to be deleted */}
              <div className="mb-6">
                <h3 className="jn:text-theme-high mb-3 font-semibold">
                  <Trans>Images to be deleted ({deletableCount})</Trans>
                </h3>
                <div className="jn:bg-theme-background-lvl-1 max-h-24 overflow-y-auto rounded p-4">
                  <ul className="space-y-2">
                    {deletableImages.map((imageId) => (
                      <li key={imageId} className="jn:text-theme-default font-mono">
                        {imageId}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Protected images (if any) */}
          {protectedCount > 0 && (
            <div className="mb-6">
              <h3 className="jn:text-theme-high mb-3 font-semibold">
                <Trans>Protected images (cannot be deleted)</Trans>
              </h3>
              <div className="jn:bg-theme-warning/10 max-h-24 overflow-y-auto rounded border border-yellow-500/20 p-4">
                <ul className="space-y-2">
                  {protectedImages.map((imageId) => (
                    <li key={imageId} className="jn:text-theme-default font-mono">
                      {imageId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="jn:bg-theme-background-lvl-2 mb-6 rounded p-4">
            {deletableCount > 0 && (
              <div className="mb-2 flex justify-between">
                <span className="jn:text-theme-default">
                  <Trans>Images to delete:</Trans>
                </span>
                <span className="jn:text-theme-highest font-semibold">{deletableCount}</span>
              </div>
            )}
            {protectedCount > 0 && (
              <div className="flex justify-between">
                <span className="jn:text-theme-default">
                  <Trans>Protected (will be skipped):</Trans>
                </span>
                <span className="jn:text-theme-warning font-semibold">{protectedCount}</span>
              </div>
            )}
          </div>

          {/* Info Notice */}
          <Message
            text={t`Deleting images will affect any instances or volumes that depend on them. Ensure these images are no longer in use before proceeding.`}
            variant="info"
            className="mb-6"
          />
        </div>
      )}
    </Modal>
  )
}
