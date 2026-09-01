import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useEffect } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Spinner, Stack, Form, FormSection, TextInput } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

// Max number of object names shown in the list before truncating
const MAX_VISIBLE = 20

// User must type this word to enable the destructive action.
const CONFIRM_WORD = "delete"

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
  const projectId = useProjectId()

  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.swift.objects.delete",
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
      if (bulkDeleteMutation.isPending) return

      markSubmitted()
      // bulkDelete expects fully-qualified paths: /<container>/<object>
      // Each segment must be URL-encoded to match Swift's bulk-delete protocol —
      // object keys containing newlines or % would otherwise corrupt the request body.
      const objects = objectKeys.map((key) => `/${encodeURIComponent(container)}/${encodeURIComponent(key)}`)
      bulkDeleteMutation.mutate({
        project_id: projectId,
        objects,
        ...(account ? { account } : {}),
      })
    },
  })

  const canDelete = useStore(form.store, (state) => state.isSubmitting || state.values.confirm.trim() !== CONFIRM_WORD)

  // Type-to-confirm guard. Bulk deletion is irreversible, so a single click is
  // not enough — the user must type CONFIRM_WORD first.

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

        const { numberDeleted } = result

        const partialResultMessage =
          numberDeleted > 0
            ? `${t`${numberDeleted} objects were deleted successfully, but some deletions failed.`}\n${errorMessages}`
            : errorMessages
        onError?.(partialResultMessage, deletedKeys)
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

  useEffect(() => {
    if (!isOpen) {
      bulkDeleteMutation.reset()
      form.reset()
      resetTracking()
    }
  }, [isOpen, resetTracking])

  const handleClose = () => {
    trackClose()
    bulkDeleteMutation.reset()
    form.reset()
    resetTracking()
    onClose()
  }

  if (!isOpen || objectKeys.length === 0) return null

  const totalCount = objectKeys.length
  const visibleNames = objectNames.slice(0, MAX_VISIBLE)
  const hiddenCount = totalCount - visibleNames.length
  const isPending = bulkDeleteMutation.isPending

  return (
    <Modal
      title={<Plural value={totalCount} one="Delete # Object" other="Delete # Objects" />}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || canDelete}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
      size="small"
    >
      {isPending ? (
        <Stack distribution="center" alignment="center" className="py-4">
          <Spinner variant="primary" />
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          <p className="text-theme-default overflow-x-hidden [overflow-wrap:anywhere]">
            <Trans>The selected objects will be permanently deleted. This cannot be undone.</Trans>
          </p>

          <div>
            <h3 className="jn:text-theme-high mb-3 font-semibold">
              <Trans>Objects to be deleted ({totalCount})</Trans>
            </h3>
            <div className="jn:bg-theme-background-lvl-1 max-h-48 overflow-y-auto rounded p-4">
              <ul className="space-y-1">
                {visibleNames.map((name) => (
                  <li key={name} className="jn:text-theme-default text-sm">
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

          <Form
            className="mb-0"
            id="delete-objects-form"
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
                    label={t`Type "${CONFIRM_WORD}" to confirm`}
                    placeholder={CONFIRM_WORD}
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    invalid={field.state.meta.errors.length > 0}
                    errortext={
                      field.state.meta.errors.map((e) => (typeof e === "string" ? e : e?.message)).join(", ") ||
                      undefined
                    }
                    disabled={isPending}
                    autoFocus
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
