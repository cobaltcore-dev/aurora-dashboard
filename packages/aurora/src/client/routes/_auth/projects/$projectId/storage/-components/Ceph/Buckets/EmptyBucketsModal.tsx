import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useState } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Spinner, Stack, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
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

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.buckets.empty",
  })

  const formSchema = z.object({
    confirm: z.string().refine((value) => value === "empty", {
      message: t`Type "empty" to confirm`,
    }),
  })

  const form = useForm({
    defaultValues: {
      confirm: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (emptyBucketMutation.isPending || progress !== null) return

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
        await utils.storage.ceph.objects.list.invalidate()
      }

      onComplete?.({ emptiedCount, totalDeleted, errors })
      handleClose()
    },
  })

  const canEmpty = useStore(form.store, (state) => state.isSubmitting || state.values.confirm !== "empty")

  const utils = trpcReact.useUtils()
  const emptyBucketMutation = trpcReact.storage.ceph.objects.deleteAll.useMutation()

  const handleClose = () => {
    trackClose()
    emptyBucketMutation.reset()
    setProgress(null)
    form.reset()
    resetTracking()
    onClose()
  }

  if (!isOpen || buckets.length === 0) return null

  const totalCount = buckets.length
  const visibleBuckets = buckets.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleBuckets.length
  const isPending = emptyBucketMutation.isPending || progress !== null
  const progressCurrent = progress?.current
  const progressTotal = progress?.total

  return (
    <Modal
      title={<Plural value={totalCount} one="Empty Bucket" other="Empty Buckets" />}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={isPending ? t`Emptying...` : totalCount === 1 ? t`Empty Bucket` : t`Empty Buckets`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || canEmpty}
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
          <p className="text-theme-default">
            <Trans>
              This will permanently delete all objects from {totalCount} selected{" "}
              <Plural value={totalCount} one="bucket" other="buckets" />. This action cannot be undone.
            </Trans>
          </p>

          <div>
            <p className="text-sm font-semibold">
              <Trans>Buckets to empty:</Trans>
            </p>
            <div className="bg-theme-background-lvl-2 mt-2 max-h-48 overflow-y-auto rounded p-3">
              <Stack direction="vertical" gap="1">
                {visibleBuckets.map((bucket) => (
                  <div
                    key={bucket.name}
                    className="text-theme-default overflow-x-hidden text-sm [overflow-wrap:anywhere]"
                  >
                    {bucket.name}
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

          <Form
            className="mb-0"
            id="empty-buckets-form"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FormSection>
              <form.Field
                name="confirm"
                children={(field) => (
                  <TextInput
                    id={field.name}
                    name={field.name}
                    label={t`Type "empty" to confirm`}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="empty"
                    autoFocus
                    disabled={isPending}
                    required
                  />
                )}
              />
            </FormSection>
          </Form>
        </Stack>
      )}
    </Modal>
  )
}
