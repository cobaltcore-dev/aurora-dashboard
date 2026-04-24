import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Spinner, Stack } from "@cloudoperators/juno-ui-components"

// Max number of object names shown in the list before truncating
const MAX_VISIBLE = 20

interface DeleteObjectsModalProps {
  isOpen: boolean
  /** Display names shown in the list (e.g. "file.txt", "folder/file.txt") */
  objectNames: string[]
  /** Full object keys passed to bulkDelete — same as objectNames in most cases */
  objectKeys: string[]
  container: string
  account?: string
  onClose: () => void
  onSuccess?: (numberDeleted: number) => void
  onError?: (errorMessage: string, deletedKeys: string[]) => void
}

export const DeleteObjectsModal = ({
  isOpen,
  objectNames,
  objectKeys,
  container,
  account,
  onClose,
  onSuccess,
  onError,
}: DeleteObjectsModalProps) => {
  const { t } = useLingui()

  const utils = trpcReact.useUtils()

  const bulkDeleteMutation = trpcReact.storage.swift.bulkDelete.useMutation({
    onSuccess: (result) => {
      utils.storage.swift.listObjects.invalidate({ container })
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => `${e.path}: ${e.error}`).join("\n")
        // Derive keys that were actually deleted so the parent can prune them from selection
        const failedPaths = new Set(result.errors.map((e) => e.path))
        const deletedKeys = objectKeys.filter(
          (key) => !failedPaths.has(`/${encodeURIComponent(container)}/${encodeURIComponent(key)}`)
        )
        if (result.numberDeleted > 0) {
          onSuccess?.(result.numberDeleted)
        }
        onError?.(errorMessages, deletedKeys)
      } else {
        onSuccess?.(result.numberDeleted)
      }
    },
    onError: (error) => {
      onError?.(error.message, [])
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    bulkDeleteMutation.reset()
    onClose()
  }

  const handleConfirm = () => {
    // bulkDelete expects fully-qualified paths: /<container>/<object>
    // Each segment must be URL-encoded to match Swift's bulk-delete protocol —
    // object keys containing newlines or % would otherwise corrupt the request body.
    const objects = objectKeys.map((key) => `/${encodeURIComponent(container)}/${encodeURIComponent(key)}`)
    bulkDeleteMutation.mutate({
      objects,
      ...(account ? { account } : {}),
    })
  }

  if (!isOpen || objectKeys.length === 0) return null

  const totalCount = objectKeys.length
  const visibleNames = objectNames.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleNames.length
  const isPending = bulkDeleteMutation.isPending

  return (
    <Modal
      title={t`Delete Objects`}
      open={isOpen}
      onCancel={isPending ? undefined : handleClose}
      confirmButtonLabel={t`Delete`}
      cancelButtonLabel={isPending ? undefined : t`Cancel`}
      onConfirm={handleConfirm}
      disableConfirmButton={isPending}
      size="small"
    >
      {isPending ? (
        <Stack distribution="center" alignment="center" className="py-4">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <div className="my-6">
          <Message variant="danger" className="mb-6">
            <Trans>
              <strong>Are you sure?</strong> The selected objects will be permanently deleted. This cannot be undone.
            </Trans>
          </Message>

          <div className="mb-6">
            <h3 className="jn:text-theme-high mb-3 font-semibold">
              <Trans>Objects to be deleted ({totalCount})</Trans>
            </h3>
            <div className="jn:bg-theme-background-lvl-1 max-h-48 overflow-y-auto rounded p-4">
              <ul className="space-y-1">
                {visibleNames.map((name) => (
                  <li key={name} className="jn:text-theme-default font-mono text-sm">
                    {name}
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && (
                <p className="text-theme-light mt-2 text-xs">
                  <Trans>... and {hiddenCount} more</Trans>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
