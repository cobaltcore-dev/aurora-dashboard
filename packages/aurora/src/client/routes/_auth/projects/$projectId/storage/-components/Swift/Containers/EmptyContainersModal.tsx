import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useState } from "react"
import React from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Spinner, Stack, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

// Max number of container names shown in the list before truncating
const MAX_VISIBLE = 20

// The literal word the user must type to confirm this destructive action.
// The gating logic (isConfirmed) compares against this constant, NOT the
// translated label — so a mistranslated label can never weaken or break the
// confirmation gate. The English label below should name the same word for clarity.
const CONFIRM_WORD = "empty"

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
  const { t, i18n } = useLingui()
  const projectId = useProjectId()

  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.swift.containers.empty",
  })

  const formSchema = z.object({
    confirm: z
      .string()
      .transform((val) => val.trim())
      .refine((value) => value === CONFIRM_WORD, {
        message: t`Type "${CONFIRM_WORD}" to confirm`,
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
      if (emptyContainerMutation.isPending || progress !== null) return

      markSubmitted()
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
    },
  })

  const canEmpty = useStore(form.store, (state) => state.isSubmitting || state.values.confirm.trim() !== CONFIRM_WORD)

  const utils = trpcReact.useUtils()

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation()

  const handleClose = () => {
    trackClose()
    emptyContainerMutation.reset()
    setProgress(null)
    form.reset()
    resetTracking()
    onClose()
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
      title={<Plural value={totalCount} one="Empty Container" other="Empty # Containers" />}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={isPending ? t`Emptying...` : t`Empty`}
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
                Emptying container {progressCurrent} of {progressTotal}, please wait...
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        <div>
          <p>
            <Trans>All objects in the selected containers will be permanently deleted. This cannot be undone.</Trans>
          </p>
          <p>
            <Trans>
              For <strong>dynamic</strong> and <strong>static large objects</strong> only the manifests are deleted —
              the related segments are not deleted.
            </Trans>
          </p>
          <div className="my-6">
            <p className="text-sm font-semibold">
              <Trans>Containers to be emptied:</Trans>
            </p>
            <div className="bg-theme-background-lvl-2 mt-2 max-h-48 overflow-y-auto rounded p-3">
              <Stack direction="vertical" gap="1">
                {visibleContainers.map((container) => {
                  const count = container.count
                  return (
                    <div
                      key={container.name}
                      className="text-theme-default overflow-x-hidden text-sm [overflow-wrap:anywhere]"
                    >
                      {container.name}
                      {count != null && (
                        <span className="text-theme-light ml-2">
                          ({i18n._(plural(count, { one: "# object", other: "# objects" }))})
                        </span>
                      )}
                    </div>
                  )
                })}
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
            id="empty-containers-form"
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
                    label={t`Type "empty" to confirm`}
                    placeholder={CONFIRM_WORD}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={isPending}
                    autoFocus
                    required
                  />
                )}
              />
            </FormSection>
          </Form>
        </div>
      )}
    </Modal>
  )
}
