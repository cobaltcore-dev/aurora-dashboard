import { z } from "zod"
import { useForm } from "@tanstack/react-form"
import { useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  Spinner,
  Message,
  TextInput,
  Select,
  SelectOption,
} from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpUpdateFields } from "./EditFloatingIpModal"

// Single source of truth for IPv4 validation (0-255 octet)
const IPV4_SEGMENT = "(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)"
const IPV4_REGEX = new RegExp(`^(?:${IPV4_SEGMENT}\\.){3}${IPV4_SEGMENT}$`)
// IPv6 regex using same IPv4 segment pattern
const IPV6_PART = `((?:${IPV4_SEGMENT})(\\.${IPV4_SEGMENT}){3})`
const IPV6_REGEX = new RegExp(
  `^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(([0-9a-fA-F]{1,4}:){1,7}:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|((?:[0-9a-fA-F]{1,4}:){1,4}:${IPV6_PART})|(::(?:ffff(?::0{1,4}){0,2})?${IPV6_PART}))$`
)

const isValidIpAddress = (value: string) => IPV4_REGEX.test(value) || IPV6_REGEX.test(value)

export interface AssociateFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string, data: FloatingIpUpdateFields) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const AssociateFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: AssociateFloatingIpModalProps) => {
  const { t } = useLingui()
  const { floating_ip_address } = floatingIp

  const formSchema = z.object({
    port_id: z.string(),
    fixed_ip_address: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || isValidIpAddress(value), { message: t`Enter a valid IPv4 or IPv6 address.` }),
  })

  const { projectId } = useParams({ strict: false })
  const { data: availablePorts = [] } = trpcReact.network.port.listAvailablePorts.useQuery(
    {
      project_id: projectId,
      tenant_id: projectId,
    },
    { enabled: !!projectId }
  )

  const form = useForm({
    defaultValues: {
      port_id: floatingIp.port_id ?? "",
      fixed_ip_address: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isLoading) return

      await onUpdate(floatingIp.id, {
        port_id: value.port_id,
        fixed_ip_address: value.fixed_ip_address,
      })
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
      title={t`Associate Floating IP ${floating_ip_address} with Port`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Associate`}
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
            <Trans>Associating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isLoading && (
        <Form
          className="mb-0"
          id="associate-floating-ip-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FormSection>
            <form.Field
              name="port_id"
              children={(field) => (
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(typeof value === "string" ? value : "")}
                  label={t`Port ID `}
                  placeholder={t`Select port to associate`}
                  errortext={field.state.meta.errors.map((e) => String(e?.message)).join(", ")}
                  disabled={isLoading}
                >
                  {availablePorts.map((port) => (
                    <SelectOption
                      key={port.id}
                      value={port.id}
                      label={port.name ? `${port.name} (${port.id})` : port.id}
                    />
                  ))}
                </Select>
              )}
            />
          </FormSection>
          <FormSection>
            <form.Field
              name="fixed_ip_address"
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`Fixed IP Address`}
                  placeholder={t`Enter a Fixed IP address`}
                  helptext={t`Associates on the selected port. If the port has multiple IPs, specify a fixed IP address; otherwise, the first IP address is used.`}
                  errortext={field.state.meta.errors.map((e) => String(e?.message)).join(", ")}
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
