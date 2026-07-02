import { useState } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Spinner, Stack, TextInput } from "@cloudoperators/juno-ui-components"
import { Bucket } from "@/server/Storage/types/ceph"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

const MAX_VISIBLE = 20

interface EmptyBucketsResult {
  emptiedCount: number
  totalDeleted: number
  errors: string[]
}

interface EmptyBucketsModalProps {
  isOpen: boolean
  buckets: Bucket[]
  onClose: () => void
  onComplete?: (result: EmptyBucketsResult) => void
}

export const EmptyBucketsModal = ({ isOpen, buckets, onClose, onComplete }: EmptyBucketsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.buckets.empty",
  })

  const utils = trpcReact.useUtils()
  const emptyBucketMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation()

  const handleClose = () => {
    emptyBucketMutation.reset()
    setProgress(null)
    setConfirmText("")
    resetTracking()
    onClose()
  }

  const handleConfirm = async () => {
    markSubmitted()
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
  const progressCurrent = progress?.current
  const progressTotal = progress?.total
  const isConfirmValid = confirmText === "empty"

  return (
    <Modal
      title={<Plural value={totalCount} one="Empty Bucket" other="Empty Buckets" />}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={isPending ? t`Emptying...` : t`Empty`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      onConfirm={handleConfirm}
      disableConfirmButton={isPending || !isConfirmValid}
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
                Emptying bucket {progressCurrent} of {progressTotal}, please wait...
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          <Trans>
            This will permanently delete all objects from {totalCount} selected{" "}
            <Plural value={totalCount} one="bucket" other="buckets" />. This action cannot be undone.
          </Trans>

          <div>
            <p className="text-theme-light mb-2 text-sm">
              <Trans>Buckets to empty:</Trans>
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {visibleBuckets.map((bucket) => {
                const bucketName = bucket.name
                const bucketCount = bucket.count
                return (
                  <li key={bucketName}>
                    {bucketName}
                    {bucketCount > 0 && (
                      <span className="text-theme-light ml-2">
                        ({bucketCount} <Plural value={bucketCount} one="object" other="objects" />)
                      </span>
                    )}
                  </li>
                )
              })}
              {hiddenCount > 0 && (
                <li className="text-theme-light">
                  <Trans>... and {hiddenCount} more</Trans>
                </li>
              )}
            </ul>
          </div>

          <TextInput
            label={t`Type "empty" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="empty"
            autoFocus
          />
        </Stack>
      )}
    </Modal>
  )
}
