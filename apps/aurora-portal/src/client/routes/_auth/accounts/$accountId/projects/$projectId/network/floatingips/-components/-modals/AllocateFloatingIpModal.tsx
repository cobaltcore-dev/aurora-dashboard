import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Textarea } from "@cloudoperators/juno-ui-components"

export interface AllocateFloatingIpModalProps {
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

// Inside {
// + Error(Alert)
// + External Network(Select)
// + DNS Domain(Select)
// + DNS Name(Select)
// + Floating IP Address(TextInput)
// + Port ID(Select)
// + Fixed IP Address(TextInput)
// } = DO_IT_WITH_MINIMAL_FIELD

export const AllocateFloatingIpModal = ({
  open,
  onClose,
  // onUpdate, -> validate list
  isLoading = false,
  error = null,
}: AllocateFloatingIpModalProps) => {
  const { t } = useLingui()

  const formSchema = z.object({
    description: z
      .string()
      .trim()
      .max(255, t`Description must be at most 255 characters.`),
  })

  const form = useForm({
    defaultValues: {
      description: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      if (isLoading) return

      // await onUpdate(floatingIp.id)
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      size="large"
      title={t`Allocate Floating IP`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Allocate`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isLoading}
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
            <Trans>Allocating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
        <Form
          className="mb-0"
          id="allocate-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {/* add dns_name  */}
          <FormSection>
            <form.Field
              name="description"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Description`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading}
                />
              )}
            />
          </FormSection>
          <FormSection>
            <form.Field
              //  add floating_ip_address
              name="description"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Description`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading}
                />
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
