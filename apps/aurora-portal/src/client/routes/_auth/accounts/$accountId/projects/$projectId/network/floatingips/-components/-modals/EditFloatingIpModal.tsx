import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Textarea, Message } from "@cloudoperators/juno-ui-components"
import type { FloatingIp, FloatingIpUpdateRequest } from "@/server/Network/types/floatingIp"

export type FloatingIpUpdateFields = Omit<FloatingIpUpdateRequest, "floatingip_id">

interface EditFloatingIpModalProps {
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
  const { description, floating_ip_address } = floatingIp

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
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isLoading) return

      const updateData: FloatingIpUpdateFields = {
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

  // creates a reactive subscription so the component re-renders, which allows the confirm button to be enabled once the user edit description field.
  const enableConfirmButton = useStore(form.store, (state) => state.isSubmitting || !state.isDirty)

  return (
    <Modal
      // Remount the modal when a different Floating IP is selected so TanStack Form picks up fresh defaultValues.
      key={floatingIp.id}
      open={open}
      size="large"
      title={t`Edit Floating IP ${floating_ip_address}`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Save`}
      disableConfirmButton={isLoading || enableConfirmButton}
      onConfirm={form.handleSubmit}
    >
      {error && (
        <Message dismissible={false} variant="error" className="mb-4">
          {error}
        </Message>
      )}

      {isLoading && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Updating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
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
