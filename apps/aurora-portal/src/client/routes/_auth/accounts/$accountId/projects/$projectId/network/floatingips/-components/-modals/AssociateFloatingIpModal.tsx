import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Form, FormSection, Spinner, Message, Select, SelectOption } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpUpdateFields } from "./EditFloatingIpModal"

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
    fixed_ip_address: z.string(),
  })

  const { projectId } = useParams({ strict: false })
  const { data: availablePorts = [] } = trpcReact.network.port.listAvailablePorts.useQuery(
    { project_id: projectId, tenant_id: projectId },
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
        ...(value.fixed_ip_address && {
          fixed_ip_address: value.fixed_ip_address,
        }),
      })
      handleClose()
    },
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const currentPortId = useStore(form.store, (state) => state.values.port_id)
  const selectedPort = availablePorts.find((port) => port.id === currentPortId)
  const portFixedIps = selectedPort?.fixed_ips ?? []

  return (
    <Modal
      id={floatingIp.id}
      open={open}
      size="large"
      title={t`Associate Floating IP ${floating_ip_address} with Port`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Associate`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isLoading || !currentPortId}
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
                  onChange={(value) => {
                    const portId = typeof value === "string" ? value : ""
                    field.handleChange(portId)
                    const port = availablePorts.find((p) => p.id === portId)
                    const ips = port?.fixed_ips ?? []
                    form.setFieldValue("fixed_ip_address", ips.length === 1 ? ips[0].ip_address : "")
                  }}
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
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(typeof value === "string" ? value : "")}
                  label={t`Fixed IP Address`}
                  placeholder={t`Select a fixed IP address`}
                  helptext={t`Associates on the selected port. If the port has multiple IPs, select the desired fixed IP address.`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading || portFixedIps.length === 0}
                >
                  {portFixedIps.map(({ ip_address }) => (
                    <SelectOption key={ip_address} value={ip_address} label={ip_address} />
                  ))}
                </Select>
              )}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
