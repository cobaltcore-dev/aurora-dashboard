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

// Inside (Error_Alert) <- Form is done

// Q: Do I need to validate ipv6?
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const dnsNameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

export const AllocateFloatingIpModal = ({
  open,
  onClose,
  // onUpdate, -> validate list
  isLoading = false,
  error = null,
}: AllocateFloatingIpModalProps) => {
  const { t } = useLingui()

  const formSchema = z.object({
    dns_name: z
      .string()
      .trim()
      .max(63, t`DNS name must be at most 63 characters.`)
      .refine((value) => value === "" || dnsNameRegex.test(value), {
        message: t`Must be a valid PQDN or FQDN (alphanumeric and hyphens only, cannot start or end with hyphen).`,
      }),
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
    fixed_ip_address: z
      .string()
      .trim()
      .refine((value) => value === "" || ipv4Regex.test(value), {
        message: t`Fixed IP address must be a valid IPv4 address (for example: 172.24.4.228).`,
      }),
  })

  const form = useForm({
    defaultValues: {
      dns_name: "",
      description: "",
      floating_ip_address: "",
      fixed_ip_address: "",
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
          {/*
            // + External Network(Select)
            // + DNS Domain(Select)
          */}

          <FormSection className="mb-4">
            <form.Field
              name="dns_name"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t`Enter DNS name`}
                  label={t`DNS Name`}
                  helptext={t`Enter a valid PQDN or FQDN (max 63 characters) to associate with the floating IP. A and PTR records are created automatically.`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading}
                />
              )}
            />
          </FormSection>
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
          <FormSection className="mb-4">
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
          {/* // + Port ID(Select) */}
          <FormSection>
            <form.Field
              name="fixed_ip_address"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`Fixed IP Address`}
                  placeholder={t`Enter a fixed IP address`}
                  helptext={t`Associates the floating IP with a fixed IP on the selected port. If the port has multiple IPs, specify fixed_ip_address; otherwise, the first fixed IP is used.`}
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
