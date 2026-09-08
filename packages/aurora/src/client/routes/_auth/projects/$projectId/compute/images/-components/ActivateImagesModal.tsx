import React from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { Modal, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

interface ActivateImagesModalProps {
  deactivatedImages: Array<GlanceImage>
  activeImages: Array<GlanceImage>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onActivate: (deactivatedImageIds: Array<string>) => void
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
    onActivate(deactivatedImages.map((img) => img.id))
  }

  return (
    <Modal
      onCancel={onClose}
      size="small"
      title={<Plural value={deactivatedCount} one="Activate # Image" other="Activate # Images" />}
      open={isOpen}
      onConfirm={handleActivate}
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
                <Trans>Activated images will be available for launching new instances.</Trans>
              </p>

              {activeCount > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold">
                    <Plural
                      value={activeCount}
                      one="Already active (# will be skipped)"
                      other="Already active (# will be skipped)"
                    />
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
              )}

              {/* Images to be activated */}
              <div className="mb-6">
                <p className="text-sm font-semibold">
                  <Plural value={deactivatedCount} one="Image to activate (#)" other="Images to activate (#)" />
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
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
