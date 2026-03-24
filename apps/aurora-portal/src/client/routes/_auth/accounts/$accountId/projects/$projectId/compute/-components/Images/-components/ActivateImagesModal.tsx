import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Spinner, Stack } from "@cloudoperators/juno-ui-components"

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
      onConfirm={(e) => {
        handleActivate(e)
        onClose()
      }}
      confirmButtonLabel={t`Activate`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isLoading}
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
              <p className="mb-6">
                <Trans>
                  You are about to activate <strong>{deactivatedCount} image(s)</strong>. Activated images will be
                  available for launching new instances.
                </Trans>
              </p>

              {/* Images to be activated */}
              <div className="mb-6">
                <h3 className="jn:text-theme-high mb-3 font-semibold">
                  <Trans>Images to be activated ({deactivatedCount})</Trans>
                </h3>
                <div className="jn:bg-theme-background-lvl-1 max-h-24 overflow-y-auto rounded p-4">
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
              <h3 className="jn:text-theme-high mb-3 font-semibold">
                <Trans>Already active (will be skipped)</Trans>
              </h3>
              <div className="jn:bg-theme-warning/10 max-h-24 overflow-y-auto rounded border border-yellow-500/20 p-4">
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
          <div className="jn:bg-theme-background-lvl-2 mb-6 rounded p-4">
            {deactivatedCount > 0 && (
              <div className="mb-2 flex justify-between">
                <span className="jn:text-theme-default">
                  <Trans>Images to activate:</Trans>
                </span>
                <span className="jn:text-theme-highest font-semibold">{deactivatedCount}</span>
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex justify-between">
                <span className="jn:text-theme-default">
                  <Trans>Already active (will be skipped):</Trans>
                </span>
                <span className="jn:text-theme-warning font-semibold">{activeCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
