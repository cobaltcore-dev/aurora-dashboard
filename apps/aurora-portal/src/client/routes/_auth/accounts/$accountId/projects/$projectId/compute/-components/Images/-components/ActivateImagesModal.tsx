import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ButtonRow, Message, Modal, ModalFooter, Spinner, Stack } from "@cloudoperators/juno-ui-components"

interface ActivateImagesModalProps {
  deactivatedImages: Array<string>
  activeImages: Array<string>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onActivate: (deactivatedImages: Array<string>) => void
}

export const ActivateImagesModal: React.FC<ActivateImagesModalProps> = ({
  deactivatedImages,
  activeImages,
  isOpen,
  isLoading,
  onClose,
  onActivate,
}) => {
  const { t } = useLingui()

  const deactivatedCount = deactivatedImages.length
  const activeCount = activeImages.length

  const handleActivate = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onActivate(deactivatedImages)
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={t`Activate Images`}
      open={isOpen}
      modalFooter={
        <ModalFooter className="flex justify-end ">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={(e) => {
                handleActivate(e)
                onClose()
              }}
              disabled={isLoading}
              data-testid={`activate-image-button`}
            >
              {isLoading ? <Spinner size="small" /> : <Trans>Activate</Trans>}
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
          {deactivatedCount > 0 && (
            <>
              {/* Header */}
              <Message
                text={t`You are about to activate ${deactivatedCount} image(s). Activated images will be available for launching new instances.`}
                variant="warning"
                className="mb-6"
              />

              {/* Images to be activated */}
              <div className="mb-6">
                <h3 className="jn:text-theme-high font-semibold mb-3">
                  <Trans>Images to be activated ({deactivatedCount})</Trans>
                </h3>
                <div className="jn:bg-theme-background-lvl-1 rounded p-4 max-h-24 overflow-y-auto">
                  <ul className="space-y-2">
                    {deactivatedImages.map((imageId) => (
                      <li key={imageId} className="jn:text-theme-default font-mono">
                        {imageId}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Already active images (if any) */}
          {activeCount > 0 && (
            <div className="mb-6">
              <h3 className="jn:text-theme-high font-semibold mb-3">
                <Trans>Already active (will be skipped)</Trans>
              </h3>
              <div className="jn:bg-theme-warning/10 border border-yellow-500/20 rounded p-4 max-h-24 overflow-y-auto">
                <ul className="space-y-2">
                  {activeImages.map((imageId) => (
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
            {deactivatedCount > 0 && (
              <div className="flex justify-between  mb-2">
                <span className="jn:text-theme-default">
                  <Trans>Images to activate:</Trans>
                </span>
                <span className="jn:text-theme-highest font-semibold">{deactivatedCount}</span>
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex justify-between ">
                <span className="jn:text-theme-default">
                  <Trans>Already active (will be skipped):</Trans>
                </span>
                <span className="jn:text-theme-warning font-semibold">{activeCount}</span>
              </div>
            )}
          </div>

          {/* Info Notice */}
          <Message
            text={t`Activated images will become available for launching new instances and creating volumes. This action will restore full functionality to the selected images.`}
            variant="info"
            className="mb-6"
          />
        </div>
      )}
    </Modal>
  )
}
