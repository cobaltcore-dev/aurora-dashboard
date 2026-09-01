import React from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Spinner, Stack } from "@cloudoperators/juno-ui-components"

interface DeactivateImagesModalProps {
  activeImages: Array<string>
  deactivatedImages: Array<string>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onDeactivate: (activeImages: Array<string>) => void
}

export const DeactivateImagesModal: React.FC<DeactivateImagesModalProps> = ({
  activeImages,
  deactivatedImages,
  isOpen,
  isLoading,
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
      onConfirm={(e) => {
        handleDeactivate(e)
        onClose()
      }}
      confirmButtonLabel={t`Deactivate`}
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
          {activeCount > 0 && (
            <>
              <p className="mb-6">
                <Trans>
                  You are about to deactivate <strong>{activeCount} image(s)</strong>. Deactivated images cannot be used
                  to launch new instances.
                </Trans>
              </p>

              {/* Images to be deactivated */}
              <div className="mb-6">
                <p className="text-sm font-semibold">
                  <Trans>Images to deactivate:</Trans>
                </p>
                <div className="jn:bg-theme-background-lvl-1 mt-2 max-h-24 overflow-y-auto rounded p-4">
                  <ul className="space-y-2">
                    {activeImages.map((imageId) => (
                      <li key={imageId} className="jn:text-theme-default">
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
              <p className="text-sm font-semibold">
                <Trans>Already deactivated (will be skipped):</Trans>
              </p>
              <div className="jn:bg-theme-background-lvl-1 mt-2 max-h-24 overflow-y-auto rounded p-4">
                <ul className="space-y-2">
                  {deactivatedImages.map((imageId) => (
                    <li key={imageId} className="jn:text-theme-default">
                      {imageId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
