import { useRef } from "react"
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

  const utils = trpcReact.useUtils()

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation()

  const handleClose = () => {
    emptyContainerMutation.reset()
    onClose()
  }

  const handleConfirm = async () => {
    containerNamesRef.current = containers.map((c) => c.name)

    let emptiedCount = 0
    let totalDeleted = 0
    const errors: string[] = []

    for (const container of containers) {
      try {
        const deleted = await emptyContainerMutation.mutateAsync({ container: container.name })
        totalDeleted += deleted
        emptiedCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`${container.name}: ${message}`)
      }
    }

    await utils.storage.swift.listContainers.invalidate()

    if (errors.length > 0) {
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
  const isPending = emptyContainerMutation.isPending

  return (
    <Modal
      title={t`Empty Containers`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Empty`}
      cancelButtonLabel={t`Cancel`}
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
