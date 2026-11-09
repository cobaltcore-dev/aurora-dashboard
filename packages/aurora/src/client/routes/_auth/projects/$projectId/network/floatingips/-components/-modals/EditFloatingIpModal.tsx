import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Status, Textarea, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks"
import type { FloatingIp, FloatingIpUpdateRequest } from "@/server/Network/types/floatingIp"

export type FloatingIpUpdateFields = Omit<FloatingIpUpdateRequest, "floatingip_id">

export interface EditFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string, data: FloatingIpUpdateFields) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const EditFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: EditFloatingIpModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { description } = floatingIp

  // Description only has length constraints, so validate live on change.
  const formSchema = z.object({
    description: z
      .string()
      .trim()
      .min(1, t`Description must be at least 1 character.`)
      .max(255, t`Description must be at most 255 characters.`),
  })

  const form = useForm({
    defaultValues: {
      description: description ?? "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isLoading) return

      const updateData: FloatingIpUpdateFields = {
        project_id: projectId,
        // we are passing port so that port association is not lost when updating description as api requires this field
        port_id: floatingIp.port_id,
        description: value.description.trim(),
      }
      await onUpdate(floatingIp.id, updateData)
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  // Reactive subscription so the Save button re-evaluates as the user edits.
  // Disabled while submitting, when unchanged, or when validation fails (e.g. description over 255 chars).
  const disableSaveButton = useStore(form.store, (state) => state.isSubmitting || !state.isDirty || !state.canSubmit)

  return (
    <Modal
      // Remount the modal when a different Floating IP is selected so TanStack Form picks up fresh defaultValues.
      key={floatingIp.id}
      open={open}
      size="large"
      title={t`Edit Description`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Save`}
      disableConfirmButton={isLoading || disableSaveButton}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
      onConfirm={form.handleSubmit}
    >
      {error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {error}
        </Message>
      )}

      {isLoading ? (
        <Status status="progress" title={t`Updating Floating IP Description...`} className="mt-0" />
      ) : (
        <Form
          className="mb-0"
          id="edit-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="description"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  label={t`Description`}
                  placeholder={t`Description`}
                  disabled={isLoading}
                  required
                />
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
