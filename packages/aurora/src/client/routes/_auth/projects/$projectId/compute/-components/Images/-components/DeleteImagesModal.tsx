import React, { useState } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { Modal, Stack, TextInput } from "@cloudoperators/juno-ui-components"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

interface DeleteImagesModalProps {
  deletableImages: Array<string>
  protectedImages: Array<string>
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onDelete: (deletableImages: Array<string>) => void
}

interface DeleteResult {
  deletedCount: number
  errorCount: number
  errors: Array<{ imageId: string; message: string }>
}

const MAX_VISIBLE = 20
const MAX_ERROR_VISIBLE = 100

export const DeleteImagesModal: React.FC<DeleteImagesModalProps> = ({
  deletableImages,
  protectedImages,
  isOpen,
  isLoading,
  onClose,
  onDelete,
}) => {
  const { t } = useLingui()
  const [result, setResult] = useState<DeleteResult | null>(null)

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen,
    confirmWord: "delete",
    trackingPrefix: "compute.images",
  })

  const deletableCount = deletableImages.length
  const protectedCount = protectedImages.length

  const handleClose = () => {
    trackClose()
    setResult(null)
    onClose()
  }

  const handleConfirm = () => {
    if (result === null) {
      // Step A: Confirm
      markSubmitted()
      onDelete(deletableImages)
      // Note: Parent component should call setResult after getting backend response
    } else {
      // Step B: Close results view
      handleClose()
    }
  }

  // Step B: Results view
  if (result !== null) {
    const visibleErrors = result.errors.slice(0, MAX_ERROR_VISIBLE)
    const hiddenErrorCount = result.errors.length - visibleErrors.length

    return (
      <Modal
        open={isOpen}
        onCancel={handleClose}
        title={<Trans>Delete Results</Trans>}
        size="large"
        confirmButtonLabel={t`Done`}
        onConfirm={handleConfirm}
      >
        <Stack direction="vertical" gap="4">
          {(() => {
            const deletedCount = result.deletedCount
            const errorCount = result.errorCount
            return (
              <p className="text-theme-default">
                <Trans id="deleteResults.summary">
                  {deletedCount} deleted, {errorCount} failed.
                </Trans>
              </p>
            )
          })()}

          {result.errors.length > 0 && (
            <div>
              <p className="text-theme-light mb-2 text-sm">
                <Trans>Failed deletions:</Trans>
              </p>
              <div className="bg-theme-background-lvl-2 max-h-96 overflow-y-auto rounded p-4">
                <Stack direction="vertical" gap="2">
                  {visibleErrors.map((e) => (
                    <div
                      key={e.imageId}
                      className="border-theme-background-lvl-3 border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="overflow-x-hidden font-medium [overflow-wrap:anywhere]" title={e.imageId}>
                        {e.imageId}
                      </div>
                      {e.message && <div className="text-juno-red mt-1 text-sm">{e.message}</div>}
                    </div>
                  ))}
                  {hiddenErrorCount > 0 && (
                    <div className="text-theme-light pt-2 text-sm">
                      <Trans>… and {hiddenErrorCount} more failures</Trans>
                    </div>
                  )}
                </Stack>
              </div>
            </div>
          )}
        </Stack>
      </Modal>
    )
  }

  // Step A: Confirm view
  const visibleDeletable = deletableImages.slice(0, MAX_VISIBLE)
  const hiddenDeletableCount = deletableImages.length - visibleDeletable.length

  const visibleProtected = protectedImages.slice(0, MAX_VISIBLE)
  const hiddenProtectedCount = protectedImages.length - visibleProtected.length

  const confirmLabel = isLoading ? t`Deleting...` : deletableCount === 1 ? t`Delete Image` : t`Delete Images`

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={<Plural value={deletableCount} one="Delete # Image" other="Delete # Images" />}
      size="large"
      confirmButtonLabel={confirmLabel}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmed || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        <p className="text-theme-default">
          <Trans>The selected images will be permanently deleted. This action cannot be undone.</Trans>
        </p>

        <div className="space-y-3">
          {deletableCount > 0 && (
            <div>
              <p className="text-sm font-semibold">
                <Trans>Images to delete:</Trans>
              </p>
              <div className="bg-theme-background-lvl-2 mt-2 max-h-48 overflow-y-auto rounded p-3">
                <Stack direction="vertical" gap="1">
                  {visibleDeletable.map((imageId) => (
                    <div
                      key={imageId}
                      className="text-theme-default overflow-x-hidden text-sm [overflow-wrap:anywhere]"
                    >
                      {imageId}
                    </div>
                  ))}
                  {hiddenDeletableCount > 0 && (
                    <div className="text-theme-light pt-2 text-sm">
                      <Trans>… and {hiddenDeletableCount} more</Trans>
                    </div>
                  )}
                </Stack>
              </div>
            </div>
          )}

          {protectedCount > 0 && (
            <div>
              <p className="text-sm font-semibold">
                <Trans>Protected images (cannot be deleted):</Trans>
              </p>
              <div className="bg-theme-warning/10 mt-2 max-h-48 overflow-y-auto rounded border border-yellow-500/20 p-3">
                <Stack direction="vertical" gap="1">
                  {visibleProtected.map((imageId) => (
                    <div
                      key={imageId}
                      className="text-theme-default overflow-x-hidden text-sm [overflow-wrap:anywhere]"
                    >
                      {imageId}
                    </div>
                  ))}
                  {hiddenProtectedCount > 0 && (
                    <div className="text-theme-light pt-2 text-sm">
                      <Trans>… and {hiddenProtectedCount} more</Trans>
                    </div>
                  )}
                </Stack>
              </div>
            </div>
          )}
        </div>

        <div>
          <TextInput
            label={t`Type "delete" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoFocus
          />
        </div>
      </Stack>
    </Modal>
  )
}
