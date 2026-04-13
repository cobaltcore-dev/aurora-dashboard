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
}

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(([0-9a-fA-F]{1,4}:){1,7}:)|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:))|(::([fF]{4}(:0{1,4})?:)?((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|(([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})))$/
const isValidIpAddress = (value: string) => ipv4Regex.test(value) || ipv6Regex.test(value)
const dnsNameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

export const AllocateFloatingIpModal = ({ open, onClose }: AllocateFloatingIpModalProps) => {
  const { t } = useLingui()
  const { projectId } = useParams({ strict: false })
  const utils = trpcReact.useUtils()

  const { isPending, ...createFloatingIpMutation } = trpcReact.network.floatingIp.create.useMutation({
    onSettled: () => utils.network.floatingIp.list.invalidate(),
  })

  const {
    data: externalNetworks = [],
    isLoading: isExternalNetworksLoading,
    error: externalNetworksError,
  } = trpcReact.network.listExternalNetworks.useQuery(
    { project_id: projectId, tenant_id: projectId },
    { enabled: !!projectId }
  )

  const {
    data: dnsDomains = [],
    isLoading: isDnsDomainsLoading,
    error: dnsDomainsError,
  } = trpcReact.network.listDnsDomains.useQuery(
    { project_id: projectId, tenant_id: projectId },
    { enabled: !!projectId }
  )

  const {
    data: availablePorts = [],
    isLoading: isPortsLoading,
    error: portsError,
  } = trpcReact.network.port.listAvailablePorts.useQuery(
    { project_id: projectId, tenant_id: projectId },
    { enabled: !!projectId }
  )

  const formSchema = z.object({
    floating_network_id: z.string(),
    dns_domain: z.string(),
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
      .refine((value) => value === "" || isValidIpAddress(value), {
        message: t`Must be a valid IPv4 or IPv6 address (for example: 172.24.4.228 or 2001:db8::1).`,
      }),
    port_id: z.string(),
    fixed_ip_address: z.string(),
  })

  const form = useForm({
    defaultValues: {
      floating_network_id: "",
      dns_domain: "",
      dns_name: "",
      description: "",
      floating_ip_address: "",
      port_id: "",
      fixed_ip_address: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (isPending) return

      await createFloatingIpMutation.mutateAsync({
        project_id: projectId ?? "",
        tenant_id: projectId ?? "",
        floating_network_id: value.floating_network_id,
        ...(value.dns_domain && { dns_domain: value.dns_domain }),
        ...(value.dns_name && { dns_name: value.dns_name }),
        ...(value.description && { description: value.description }),
        ...(value.floating_ip_address && { floating_ip_address: value.floating_ip_address }),
        ...(value.port_id && { port_id: value.port_id }),
        ...(value.fixed_ip_address && { fixed_ip_address: value.fixed_ip_address }),
      })
      handleClose()
    },
  })

  const handleClose = () => {
    if (isPending) return

    form.reset()
    createFloatingIpMutation.reset()
    onClose()
  }

  const currentPortId = useStore(form.store, (state) => state.values.port_id)
  const currentFloatingNetworkId = useStore(form.store, (state) => state.values.floating_network_id)
  const selectedPort = availablePorts.find((port) => port.id === currentPortId)
  const portFixedIps = selectedPort?.fixed_ips ?? []

  const formErrorMessage =
    (externalNetworksError?.message || dnsDomainsError?.message || portsError?.message) ??
    createFloatingIpMutation.error?.message ??
    null

  return (
    <Modal
      open={open}
      size="large"
      title={t`Allocate Floating IP`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Allocate`}
      onConfirm={form.handleSubmit}
      disableConfirmButton={isPending || !currentFloatingNetworkId}
    >
      {formErrorMessage && (
        <Message dismissible={false} variant="error" className="mb-4">
          {formErrorMessage}
        </Message>
      )}

      {isPending && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <Spinner variant="primary" />
          <span className="text-theme-high text-sm">
            <Trans>Allocating Floating IP...</Trans>
          </span>
        </div>
      )}

      {!isPending && (
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
                  onChange={(value) => field.handleChange(typeof value === "string" ? value : "")}
                  label={t`External Network`}
                  helptext={t`The ID of the network associated with the floating IP.`}
                  placeholder={t`Select an external network`}
                  disabled={isPending || isExternalNetworksLoading || externalNetworks.length === 0}
                  loading={isExternalNetworksLoading}
                >
                  {externalNetworks.map(({ id, name }) => (
                    <SelectOption key={id} value={id} label={name ? `${name} (${id})` : id} />
                  ))}
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
                  onChange={(value) => field.handleChange(typeof value === "string" ? value : "")}
                  label={t`DNS Domain`}
                  helptext={t`Select a DNS domain.`}
                  disabled={isPending || isDnsDomainsLoading || dnsDomains.length === 0}
                  loading={isDnsDomainsLoading}
                >
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
                  label={t`DNS Name`}
                  placeholder={t`Enter DNS name`}
                  helptext={t`Enter a valid PQDN or FQDN (max 63 characters) to associate with the floating IP. A and PTR records are created automatically.`}
                  errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                  disabled={isPending}
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
                  disabled={isPending}
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
                  disabled={isPending}
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
                  disabled={isPending || isPortsLoading}
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
                  disabled={isPending || portFixedIps.length === 0}
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
