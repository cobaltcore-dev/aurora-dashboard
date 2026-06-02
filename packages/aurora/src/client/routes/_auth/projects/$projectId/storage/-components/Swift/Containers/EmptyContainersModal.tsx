import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"

// Max number of container names shown in the list before truncating
const MAX_VISIBLE = 20

interface EmptyContainersResult {
  emptiedCount: number
  totalDeleted: number
  errors: string[]
}

interface EmptyContainersModalProps {
  isOpen: boolean
  containers: ContainerSummary[]
  onClose: () => void
  onComplete?: (result: EmptyContainersResult) => void
}

export const EmptyContainersModal = ({ isOpen, containers, onClose, onComplete }: EmptyContainersModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()

  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const utils = trpcReact.useUtils()

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation()

  const handleClose = () => {
    emptyContainerMutation.reset()
    setProgress(null)
    onClose()
  }

  const handleConfirm = async () => {
    let emptiedCount = 0
    let totalDeleted = 0
    const errors: string[] = []
    const total = containers.length

    for (let i = 0; i < containers.length; i++) {
      setProgress({ current: i + 1, total })
      const container = containers[i]

      try {
        const deleted = await emptyContainerMutation.mutateAsync({ project_id: projectId, container: container.name })
        totalDeleted += deleted
        emptiedCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`${container.name}: ${message}`)
      }
    }

    if (emptiedCount > 0) {
      await utils.storage.swift.listContainers.invalidate()
    }

    onComplete?.({ emptiedCount, totalDeleted, errors })

    handleClose()
  }

  if (!isOpen || containers.length === 0) return null

  const totalCount = containers.length
  const visibleContainers = containers.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleContainers.length
  const isPending = emptyContainerMutation.isPending || progress !== null
  const progressCurrent = progress?.current
  const progressTotal = progress?.total

  return (
    <Modal
      title={t`Empty Containers`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Emptying...` : t`Empty`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      onConfirm={handleConfirm}
      disableConfirmButton={isPending}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
      size="small"
    >
      {isPending ? (
        <Stack direction="vertical" distribution="center" alignment="center" gap="2" className="py-4">
          <Spinner variant="primary" />
          {progress && (
            <p className="text-theme-light text-sm">
              <Trans>
                Emptying container {progressCurrent} of {progressTotal}, please wait...
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        <div className="my-6">
          <p className="text-theme-default mb-6">
            <Trans>All objects in the selected containers will be permanently deleted. This cannot be undone.</Trans>
            <br />
            <Trans>
              Please note: for <strong>dynamic</strong> and <strong>static large objects</strong> only the manifests are
              deleted. The related segments are not deleted.
            </Trans>
          </p>

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
