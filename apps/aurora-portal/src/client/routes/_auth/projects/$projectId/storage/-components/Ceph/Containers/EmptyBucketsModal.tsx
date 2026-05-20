import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { Container } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"

const MAX_VISIBLE = 20

interface EmptyBucketsResult {
  emptiedCount: number
  totalDeleted: number
  errors: string[]
}

interface EmptyBucketsModalProps {
  isOpen: boolean
  buckets: Container[]
  onClose: () => void
  onComplete?: (result: EmptyBucketsResult) => void
}

export const EmptyBucketsModal = ({ isOpen, buckets, onClose, onComplete }: EmptyBucketsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const utils = trpcReact.useUtils()
  const emptyBucketMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation()

  const handleClose = () => {
    emptyBucketMutation.reset()
    setProgress(null)
    onClose()
  }

  const handleConfirm = async () => {
    let emptiedCount = 0
    let totalDeleted = 0
    const errors: string[] = []
    const total = buckets.length

    for (let i = 0; i < buckets.length; i++) {
      setProgress({ current: i + 1, total })
      const bucket = buckets[i]

      try {
        const deleted = await emptyBucketMutation.mutateAsync({
          project_id: projectId,
          containerName: bucket.name,
        })
        totalDeleted += deleted
        emptiedCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`${bucket.name}: ${message}`)
      }
    }

    if (emptiedCount > 0) {
      await utils.storage.ceph.containers.list.invalidate()
    }

    onComplete?.({ emptiedCount, totalDeleted, errors })
    handleClose()
  }

  if (!isOpen || buckets.length === 0) return null

  const totalCount = buckets.length
  const visibleBuckets = buckets.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleBuckets.length
  const isPending = emptyBucketMutation.isPending || progress !== null

  return (
    <Modal
      title={t`Empty Buckets`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Emptying...` : t`Empty`}
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
                Emptying bucket {progress.current} of {progress.total}, please wait...
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          <Message variant="warning">
            <Trans>
              This will permanently delete all objects from {totalCount} selected{" "}
              {totalCount === 1 ? "bucket" : "buckets"}. This action cannot be undone.
            </Trans>
          </Message>

          <div>
            <p className="text-theme-light mb-2 text-sm">
              <Trans>Buckets to empty:</Trans>
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {visibleBuckets.map((bucket) => (
                <li key={bucket.name} className="font-mono">
                  {bucket.name}
                  {bucket.count > 0 && (
                    <span className="text-theme-light ml-2">
                      ({bucket.count} {bucket.count === 1 ? "object" : "objects"})
                    </span>
                  )}
                </li>
              ))}
              {hiddenCount > 0 && (
                <li className="text-theme-light">
                  <Trans>...and {hiddenCount} more</Trans>
                </li>
              )}
            </ul>
          </div>
        </Stack>
      )}
    </Modal>
  )
}
