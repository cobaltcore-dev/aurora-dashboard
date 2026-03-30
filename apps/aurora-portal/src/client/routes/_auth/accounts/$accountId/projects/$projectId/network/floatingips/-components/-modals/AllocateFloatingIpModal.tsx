import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  Spinner,
  Message,
  Textarea,
  TextInput,
  Select,
  SelectOption,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"

export interface AllocateFloatingIpModalProps {
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

// Inside (Error_Alert) <- Form is done
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(([0-9a-fA-F]{1,4}:){1,7}:)|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:))|(::([fF]{4}(:0{1,4})?:)?((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|(([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})))$/
const isValidIpAddress = (value: string) => ipv4Regex.test(value) || ipv6Regex.test(value)
const dnsNameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

export const AllocateFloatingIpModal = ({
  open,
  onClose,
  // onUpdate, -> validate list
  isLoading = false,
  error = null,
}: AllocateFloatingIpModalProps) => {
  const { t } = useLingui()
  const { projectId } = useParams({ strict: false })

  const {
    data: externalNetworks = [],
    isLoading: isExternalNetworksLoading,
    error: externalNetworksError,
  } = trpcReact.network.listExternalNetworks.useQuery(
    {
      project_id: projectId ?? undefined,
    },
    { enabled: open }
  )

  const {
    data: dnsDomains = [],
    isLoading: isDnsDomainsLoading,
    error: dnsDomainsError,
  } = trpcReact.network.listDnsDomains.useQuery(
    {
      project_id: projectId ?? undefined,
    },
    { enabled: open }
  )

  // refactoring_start
  const {
    data: availablePorts = [],
    isLoading: isPortsLoading,
    error: portsError,
  } = trpcReact.network.port.listAvailablePorts.useQuery(
    { project_id: projectId, tenant_id: projectId },
    { enabled: !!projectId }
  )

  // const formErrorMessage = externalNetworksError?.message ?? dnsDomainsError?.message
  const portErrorMessage = portsError?.message ?? error
  // refactoring_end

  const formSchema = z.object({
    floating_network_id: z.string().trim(),
    dns_domain: z.string().trim(),
    dns_name: z
      .string()
      .trim()
      .max(63, t`DNS name must be at most 63 characters.`)
      .refine((value) => value === "" || dnsNameRegex.test(value), {
        message: t`Must be a valid PQDN or FQDN (alphanumeric and hyphens only, cannot start or end with hyphen).`,
      }),
    // refactoring_start
    description: z
      .string()
      .trim()
      .max(255, t`Description must be at most 255 characters.`),
    floating_ip_address: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidIpAddress(value), {
        message: t`Must be a valid IPv4 or IPv6 address (for example: 172.24.4.228 or 2001:db8::1).`,
      }),
    port_id: z.string(),
    fixed_ip_address: z.string(),
  })

  // refactoring_end
  const form = useForm({
    defaultValues: {
      dns_name: "",
      floating_network_id: "",
      dns_domain: "",
      // refactoring_start
      description: "",
      floating_ip_address: "",
      port_id: "",
      fixed_ip_address: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    // refactoring_end
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

  const currentPortId = useStore(form.store, (state) => state.values.port_id)
  const selectedPort = availablePorts.find((port) => port.id === currentPortId)
  const portFixedIps = selectedPort?.fixed_ips ?? []

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
      {portErrorMessage && (
        <Message dismissible={false} variant="error" className="mb-4">
          {portErrorMessage}
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
          <FormSection className="mb-4">
            <form.Field
              name="floating_network_id"
              children={(field) => (
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(String(value))}
                  label={t`External Network`}
                  helptext={t`Select an external network to allocate the floating IP from.`}
                  disabled={isLoading || isExternalNetworksLoading}
                  loading={isExternalNetworksLoading}
                >
                  <SelectOption value="" label={t`None (optional)`} />
                  {externalNetworks.map((network) => {
                    const label = network.name ? `${network.name} (${network.id})` : network.id
                    return <SelectOption key={network.id} value={network.id} label={label} />
                  })}
                </Select>
              )}
            />
          </FormSection>

          <FormSection className="mb-4">
            <form.Field
              name="dns_domain"
              children={(field) => (
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(String(value))}
                  label={t`DNS Domain`}
                  helptext={t`Select a DNS domain to use with the floating IP DNS name.`}
                  disabled={isLoading || isDnsDomainsLoading}
                  loading={isDnsDomainsLoading}
                >
                  <SelectOption value="" label={t`None (optional)`} />
                  {dnsDomains.map((domain) => (
                    <SelectOption key={domain} value={domain} label={domain} />
                  ))}
                </Select>
              )}
            />
          </FormSection>

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

          {/* refactoring_end_END. */}
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
          <FormSection className="mb-4">
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
                  label={t`Port ID`}
                  placeholder={t`Select port to associate`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isLoading || isPortsLoading}
                  loading={isPortsLoading}
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
                  onBlur={field.handleBlur}
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
