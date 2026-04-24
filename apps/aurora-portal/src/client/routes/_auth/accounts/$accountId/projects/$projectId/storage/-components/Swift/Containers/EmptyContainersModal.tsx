import { useRef, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"

// Max number of container names shown in the list before truncating
const MAX_VISIBLE = 20

interface EmptyContainersModalProps {
  isOpen: boolean
  containers: ContainerSummary[]
  onClose: () => void
  onSuccess?: (emptiedCount: number, totalDeleted: number) => void
  onError?: (errorMessage: string) => void
}

export const EmptyContainersModal = ({
  isOpen,
  containers,
  onClose,
  onSuccess,
  onError,
}: EmptyContainersModalProps) => {
  const { t } = useLingui()
  const containerNamesRef = useRef<string[]>([])
  // Cancellation flag — set to true by handleClose so the for loop stops
  // issuing further mutateAsync calls after the user clicks Cancel.
  const cancelledRef = useRef(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const utils = trpcReact.useUtils()

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation()

  const handleClose = () => {
    cancelledRef.current = true
    emptyContainerMutation.reset()
    setProgress(null)
    onClose()
  }

  const handleConfirm = async () => {
    containerNamesRef.current = containers.map((c) => c.name)
    cancelledRef.current = false

    let emptiedCount = 0
    let totalDeleted = 0
    const errors: string[] = []
    const total = containers.length

    for (let i = 0; i < containers.length; i++) {
      // Stop issuing new requests if the user cancelled
      if (cancelledRef.current) break

      setProgress({ current: i + 1, total })
      const container = containers[i]

      try {
        const deleted = await emptyContainerMutation.mutateAsync({ container: container.name })
        totalDeleted += deleted
        emptiedCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`${container.name}: ${message}`)
      }
    }

    // Don't fire callbacks or invalidate if the user cancelled mid-loop
    if (cancelledRef.current) return

    await utils.storage.swift.listContainers.invalidate()

    if (errors.length > 0) {
      if (emptiedCount > 0) {
        onSuccess?.(emptiedCount, totalDeleted)
      }
      onError?.(errors.join("\n"))
    } else {
      onSuccess?.(emptiedCount, totalDeleted)
    }

    handleClose()
  }

  if (!isOpen || containers.length === 0) return null

  const totalCount = containers.length
  const visibleContainers = containers.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleContainers.length
  const isPending = emptyContainerMutation.isPending || progress !== null

  return (
    <Modal
      title={t`Empty Containers`}
      open={isOpen}
      // Disable Cancel while the loop is running to prevent misleading the user
      // into thinking the operation was stopped when it may still be in-flight.
      onCancel={isPending ? undefined : handleClose}
      confirmButtonLabel={t`Empty`}
      cancelButtonLabel={isPending ? undefined : t`Cancel`}
      onConfirm={handleConfirm}
      disableConfirmButton={isPending}
      size="small"
    >
      {isPending ? (
        <Stack direction="vertical" distribution="center" alignment="center" gap="2" className="py-4">
          <Spinner variant="primary" />
          {progress && (
            <p className="text-theme-light text-sm">
              {(() => {
                const current = progress.current
                const total = progress.total
                return (
                  <Trans>
                    Emptying {current} of {total}…
                  </Trans>
                )
              })()}
            </p>
          )}
        </Stack>
      ) : (
        <div className="my-6">
          <Message variant="warning" className="mb-6">
            <Trans>
              <strong>Are you sure?</strong> All objects in the selected containers will be permanently deleted. This
              cannot be undone.
            </Trans>
            <br />
            <Trans>
              Please note: for <strong>dynamic</strong> and <strong>static large objects</strong> only the manifests are
              deleted. The related segments are not deleted.
            </Trans>
          </Message>

          <div className="mb-6">
            <h3 className="jn:text-theme-high mb-3 font-semibold">
              <Trans>Containers to be emptied ({totalCount})</Trans>
            </h3>
            <div className="jn:bg-theme-background-lvl-1 max-h-48 overflow-y-auto rounded p-4">
              <ul className="space-y-1">
                {visibleContainers.map((container) => (
                  <li key={container.name} className="jn:text-theme-default font-mono text-sm">
                    {container.name}
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && (
                <p className="text-theme-light mt-2 text-xs">
                  <Trans>… and {hiddenCount} more</Trans>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
