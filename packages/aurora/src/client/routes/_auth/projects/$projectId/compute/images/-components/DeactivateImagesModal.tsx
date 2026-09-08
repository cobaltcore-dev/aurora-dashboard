import React from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { Modal, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

interface DeactivateImagesModalProps {
  activeImages: Array<GlanceImage>
  deactivatedImages: Array<GlanceImage>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onDeactivate: (activeImageIds: Array<string>) => void
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
    onDeactivate(activeImages.map((img) => img.id))
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={<Plural value={activeCount} one="Deactivate # Image" other="Deactivate # Images" />}
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
                <Trans>Deactivated images cannot be used to launch instances.</Trans>
              </p>

              {deactivatedCount > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold">
                    <Plural
                      value={deactivatedCount}
                      one="Already deactivated (# will be skipped)"
                      other="Already deactivated (# will be skipped)"
                    />
                  </p>
                  <div className="jn:bg-theme-background-lvl-1 mt-2 max-h-24 overflow-y-auto rounded p-4">
                    <div className="space-y-1">
                      {deactivatedImages.map((image) => (
                        <div key={image.id} className="text-theme-default text-sm">
                          <span className="font-medium">{image.name || t`Unnamed`}</span>
                          <span className="text-theme-light ml-2 text-xs">({image.id})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Images to be deactivated */}
              <div className="mb-6">
                <p className="text-sm font-semibold">
                  <Plural value={activeCount} one="Image to deactivate (#)" other="Images to deactivate (#)" />
                </p>
                <div className="jn:bg-theme-background-lvl-1 mt-2 max-h-24 overflow-y-auto rounded p-4">
                  <div className="space-y-1">
                    {activeImages.map((image) => (
                      <div key={image.id} className="text-theme-default text-sm">
                        <span className="font-medium">{image.name || t`Unnamed`}</span>
                        <span className="text-theme-light ml-2 text-xs">({image.id})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
