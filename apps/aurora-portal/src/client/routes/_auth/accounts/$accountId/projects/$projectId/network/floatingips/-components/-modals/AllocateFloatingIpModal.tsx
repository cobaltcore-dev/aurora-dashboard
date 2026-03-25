import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Textarea, TextInput } from "@cloudoperators/juno-ui-components"

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

// Q: Do I need to validate ipv6?
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

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
    floating_ip_address: z
      .string()
      .trim()
      .refine((value) => value === "" || ipv4Regex.test(value), {
        message: t`Must be a valid IPv4 address (for example: 172.24.4.228).`,
      }),
  })

  const form = useForm({
    defaultValues: {
      description: "",
      floating_ip_address: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isLoading) return

      // Use `value` for the latest validated snapshot across all fields.
      // await onUpdate(floatingIp.id, value)
      void value
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
          <FormSection className="mb-4">
            <form.Field
              name="description"
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
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
              name="floating_ip_address"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`Floating IP Address`}
                  placeholder={t`Enter a floating IP`}
                  helptext={t`Enter a floating IP or leave blank to auto-assign one`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading}
                />
              )}
            />
          </FormSection>
          {/* add port_id (select) */}
        </Form>
      )}
    </Modal>
  )
}
