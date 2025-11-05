import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ButtonRow, Message, Modal, ModalFooter, Spinner, Stack } from "@cloudoperators/juno-ui-components"

interface DeactivateImagesModalProps {
  activeImages: Array<string>
  deactivatedImages: Array<string>
  isOpen: boolean
  isLoading: boolean
  isDisabled: boolean
  onClose: () => void
  onDeactivate: (activeImages: Array<string>) => void
}

export const DeactivateImagesModal: React.FC<DeactivateImagesModalProps> = ({
  activeImages,
  deactivatedImages,
  isOpen,
  isLoading,
  isDisabled,
  onClose,
  onDeactivate,
}) => {
  const { t } = useLingui()

  const activeCount = activeImages.length
  const deactivatedCount = deactivatedImages.length

  const handleDeactivate = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onDeactivate(activeImages)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Deactivate Images`}
      open={isOpen}
      modalFooter={
        <ModalFooter className="flex justify-end ">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                handleDeactivate(e)
                onClose()
              }}
              disabled={isLoading || isDisabled}
              data-testid={`deactivate-image-button`}
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Deactivate</Trans>}
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
          {activeCount > 0 && (
            <>
              {/* Header */}
              <Message
                text={t`You are about to deactivate ${activeCount} image(s). Deactivated images cannot be used to launch new instances.`}
                variant="warning"
                className="mb-6"
              />

              {/* Images to be deactivated */}
              <div className="mb-6">
                <h3 className="jn:text-theme-high font-semibold mb-3">
                  <Trans>Images to be deactivated ({activeCount})</Trans>
                </h3>
                <div className="jn:bg-theme-background-lvl-1 rounded p-4 max-h-24 overflow-y-auto">
                  <ul className="space-y-2">
                    {activeImages.map((imageId) => (
                      <li key={imageId} className="jn:text-theme-default font-mono">
                        {imageId}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Already deactivated images (if any) */}
          {deactivatedCount > 0 && (
            <div className="mb-6">
              <h3 className="jn:text-theme-high font-semibold mb-3">
                <Trans>Already deactivated (will be skipped)</Trans>
              </h3>
              <div className="jn:bg-theme-warning/10 border border-yellow-500/20 rounded p-4 max-h-24 overflow-y-auto">
                <ul className="space-y-2">
                  {deactivatedImages.map((imageId) => (
                    <li key={imageId} className="jn:text-theme-default font-mono">
                      {imageId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="jn:bg-theme-background-lvl-2 rounded p-4 mb-6">
            {activeCount > 0 && (
              <div className="flex justify-between  mb-2">
                <span className="jn:text-theme-default">
                  <Trans>Images to deactivate:</Trans>
                </span>
                <span className="jn:text-theme-highest font-semibold">{activeCount}</span>
              </div>
            )}
            {deactivatedCount > 0 && (
              <div className="flex justify-between ">
                <span className="jn:text-theme-default">
                  <Trans>Already deactivated (will be skipped):</Trans>
                </span>
                <span className="jn:text-theme-warning font-semibold">{deactivatedCount}</span>
              </div>
            )}
          </div>

          {/* Info Notice */}
          <Message
            text={t`Deactivated images will not be available for launching new instances or creating volumes. Existing instances using these images will not be affected. You can reactivate images later if needed.`}
            variant="info"
            className="mb-6"
          />
        </div>
      )}
    </Modal>
  )
}
