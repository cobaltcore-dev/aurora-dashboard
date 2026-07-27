import { useState } from "react"
import { Trans, Plural, useLingui } from "@lingui/react/macro"
import { Modal, TextInput, Stack, Message } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import type { DeleteObjectsBulkOutput } from "@/server/Storage/types/ceph"

interface DeleteObjectsModalProps {
  bucketName: string
  objectKeys: string[]
  currentPrefix: string
  versioningEnabled?: boolean
  isOpen: boolean
  onClose: () => void
  onDeleted: (deletedKeys: string[], errorCount: number) => void
  onError: (errorMessage: string) => void
}

const MAX_VISIBLE = 20
const MAX_ERROR_VISIBLE = 100

export function DeleteObjectsModal({
  bucketName,
  objectKeys,
  currentPrefix,
  versioningEnabled = false,
  isOpen,
  onClose,
  onDeleted,
  onError,
}: DeleteObjectsModalProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmText, setConfirmText] = useState("")
  const [result, setResult] = useState<DeleteObjectsBulkOutput | null>(null)
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.objects.delete_bulk",
  })

  const deleteBulkMutation = trpcReact.storage.ceph.objects.deleteBulk.useMutation({
    onSuccess: (res) => {
      utils.storage.ceph.objects.list.invalidate()
      utils.storage.ceph.containers.list.invalidate()
      onDeleted(
        res.deleted.map((d) => d.key),
        res.errorCount
      )
      if (res.errorCount === 0) {
        handleClose()
      } else {
        setResult(res)
      }
    },
    onError: (error) => onError(error.message),
  })

  const handleClose = () => {
    setConfirmText("")
    setResult(null)
    deleteBulkMutation.reset()
    resetTracking()
    onClose()
  }

  const handleConfirm = () => {
    if (!projectId) return

    if (result === null) {
      // Step A: Confirm
      markSubmitted()
      deleteBulkMutation.mutate({
        project_id: projectId,
        containerName: bucketName,
        objectKeys,
      })
    } else {
      // Step B: Close results view
      handleClose()
    }
  }

  if (!isOpen || objectKeys.length === 0) return null

  const count = objectKeys.length
  const isConfirmValid = confirmText === "DELETE"
  const isPending = deleteBulkMutation.isPending

  // Step B: Results view
  if (result !== null) {
    const visibleErrors = result.errors.slice(0, MAX_ERROR_VISIBLE)
    const hiddenErrorCount = result.errors.length - visibleErrors.length

    return (
      <Modal
        open={isOpen}
        onCancel={() => {
          trackClose()
          handleClose()
        }}
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
                <Trans>
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
                  {visibleErrors.map((e, idx) => {
                    const displayName = e.key.replace(currentPrefix, "") || e.key
                    const errorDetail = e.code ? (e.message ? `${e.code}: ${e.message}` : e.code) : e.message || ""
                    return (
                      <div key={idx} className="border-theme-background-lvl-3 border-b pb-2 last:border-0 last:pb-0">
                        <div className="overflow-x-hidden font-medium [overflow-wrap:anywhere]" title={e.key}>
                          {displayName}
                        </div>
                        {errorDetail && <div className="text-juno-red mt-1 text-sm">{errorDetail}</div>}
                      </div>
                    )
                  })}
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
  const visibleNames = objectKeys.slice(0, MAX_VISIBLE).map((key) => key.replace(currentPrefix, "") || key)
  const hiddenCount = count - visibleNames.length

  return (
    <Modal
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      title={<Plural value={count} one="Delete # Object" other="Delete # Objects" />}
      size="large"
      confirmButtonLabel={isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmValid || isPending}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
    >
      <Stack direction="vertical" gap="4">
        <Message variant="danger">
          {versioningEnabled ? (
            <Trans>The selected objects will be marked as deleted and can be restored from version history.</Trans>
          ) : (
            <Trans>The selected objects will be permanently deleted. This cannot be undone.</Trans>
          )}
        </Message>

        <div>
          <p className="text-theme-light mb-2 text-sm">
            <Trans>Objects to delete:</Trans>
          </p>
          <div className="bg-theme-background-lvl-2 max-h-48 overflow-y-auto rounded p-4">
            <Stack direction="vertical" gap="1">
              {visibleNames.map((name, idx) => (
                <div key={idx} className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
                  {name}
                </div>
              ))}
              {hiddenCount > 0 && (
                <div className="text-theme-light pt-2 text-sm">
                  <Trans>… and {hiddenCount} more</Trans>
                </div>
              )}
            </Stack>
          </div>
        </div>

        <div>
          <TextInput
            label={t`Type DELETE to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            helptext={
              versioningEnabled
                ? t`The objects can be restored from version history.`
                : t`This action cannot be undone.`
            }
          />
        </div>

        {deleteBulkMutation.error && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {deleteBulkMutation.error.message}
          </p>
        )}
      </Stack>
    </Modal>
  )
}
