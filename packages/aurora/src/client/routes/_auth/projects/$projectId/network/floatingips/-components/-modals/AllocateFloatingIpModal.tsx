import { z } from "zod"
import { useForm, useStore } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Form,
  FormSection,
  Status,
  Message,
  Textarea,
  TextInput,
  Select,
  SelectOption,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks"

export interface AllocateFloatingIpModalProps {
  open: boolean
  onClose: () => void
}

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(([0-9a-fA-F]{1,4}:){1,7}:)|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:))|(::([fF]{4}(:0{1,4})?:)?((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|(([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})))$/
const isValidIpAddress = (value: string) => ipv4Regex.test(value) || ipv6Regex.test(value)

// DNS Name is a single hostname label (no domain): letters, digits and hyphens, not first/last.
const dnsNameLabelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
// Value for the DNS Domain "None" option so the placeholder shows when nothing is selected; selecting it will reset the field to ""
const DNS_DOMAIN_NONE_VALUE = "__none__"

export const AllocateFloatingIpModal = ({ open, onClose }: AllocateFloatingIpModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate()
  const utils = trpcReact.useUtils()

  const { isPending, ...createFloatingIpMutation } = trpcReact.network.floatingIp.create.useMutation({
    onSettled: () => utils.network.floatingIp.list.invalidate(),
  })

  const {
    data: externalNetworks = [],
    isLoading: isExternalNetworksLoading,
    error: externalNetworksError,
  } = trpcReact.network.floatingIp.listExternalNetworks.useQuery({ project_id: projectId })

  const {
    data: dnsDomains = [],
    isLoading: isDnsDomainsLoading,
    error: dnsDomainsError,
  } = trpcReact.network.floatingIp.listDnsDomains.useQuery({ project_id: projectId })

  const {
    data: availablePorts = [],
    isLoading: isPortsLoading,
    error: portsError,
  } = trpcReact.network.floatingIp.listAvailablePorts.useQuery({ project_id: projectId })

  // Specifying an exact floating IP address is admin-only; the field is hidden for everyone else
  // Non admin users get an auto-assigned floating IP address instead
  const { data: canSpecifyIpAddress = false } = trpcReact.network.canUser.useQuery(
    { project_id: projectId, permission: ["network:floatingips:specify_ip_address"] },
    { select: ([canSpecify]) => canSpecify }
  )

  const formSchema = z.object({
    floating_network_id: z.string(),
    dns_domain: z.string(),
    dns_name: z.string(),
    description: z.string(),
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
    listeners: {
      // A failed allocation keeps Allocate button disabled via isError. Editing any field clears that
      // stale server error so the user can correct their input and retry without reopening the modal.
      onChange: () => {
        if (createFloatingIpMutation.isError) createFloatingIpMutation.reset()
      },
    },
    onSubmit: async ({ value }) => {
      if (isPending) return

      const created = await createFloatingIpMutation.mutateAsync({
        project_id: projectId,
        floating_network_id: value.floating_network_id,
        ...(value.dns_domain && { dns_domain: value.dns_domain }),
        ...(value.dns_name && { dns_name: value.dns_name }),
        ...(value.description && { description: value.description }),
        ...(value.floating_ip_address && { floating_ip_address: value.floating_ip_address }),
        ...(value.port_id && { port_id: value.port_id }),
        ...(value.fixed_ip_address && { fixed_ip_address: value.fixed_ip_address }),
      })
      handleClose()
      navigate({
        to: "/projects/$projectId/network/floatingips/$floatingIpId",
        params: { projectId, floatingIpId: created.id },
      })
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
  // False when any field (required or optional) has a validation error
  const canSubmit = useStore(form.store, (state) => state.canSubmit)
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
      // Disabled while submitting, until the required network is selected, or while any client/server
      // error is present. A server error clears as soon as the user edits a field.
      disableConfirmButton={isPending || !currentFloatingNetworkId || !canSubmit || createFloatingIpMutation.isError}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
    >
      {formErrorMessage && (
        <Message dismissible={false} variant="error" className="mb-4">
          {formErrorMessage}
        </Message>
      )}

      {isPending ? (
        <Status status="progress" title={t`Allocating Floating IP...`} className="mt-0" />
      ) : (
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
                  disabled={isPending || isExternalNetworksLoading}
                  required
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
              // DNS Domain and Name are interdependent: providing one requires the other field.
              validators={{
                onChangeListenTo: ["dns_name"],
                onChange: ({ value, fieldApi }) =>
                  fieldApi.form.getFieldValue("dns_name").trim() && !value
                    ? t`DNS domain is required when a DNS name is entered.`
                    : undefined,
              }}
              children={(field) => (
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) =>
                    field.handleChange(typeof value === "string" && value !== DNS_DOMAIN_NONE_VALUE ? value : "")
                  }
                  label={t`DNS Domain`}
                  helptext={t`Select a DNS domain.`}
                  placeholder={t`Select a DNS domain`}
                  errortext={field.state.meta.errors.map((e) => (typeof e === "string" ? e : e?.message)).join(", ")}
                  disabled={isPending || isDnsDomainsLoading}
                  loading={isDnsDomainsLoading}
                >
                  {/* Allows clearing the optional DNS Domain selection; resets the field to "". */}
                  <SelectOption value={DNS_DOMAIN_NONE_VALUE} label={t`None`} />
                  {dnsDomains.map(({ id, name }) => (
                    <SelectOption key={id} value={name} label={name} />
                  ))}
                </Select>
              )}
            />
          </FormSection>
          <FormSection className="mb-4">
            <form.Field
              name="dns_name"
              // DNS Name and Domain are interdependent: providing one requires the other field.
              validators={{
                onChangeListenTo: ["dns_domain"],
                onChange: ({ value, fieldApi }) => {
                  if (value.trim().length > 63) return t`DNS name must be at most 63 characters.`
                  if (fieldApi.form.getFieldValue("dns_domain") && !value.trim())
                    return t`DNS name is required when a DNS domain is selected.`
                  if (value.trim() && !dnsNameLabelRegex.test(value.trim()))
                    return t`DNS name must use only letters, digits, and hyphens, and must start and end with a letter or digit.`
                  return undefined
                },
              }}
              children={(field) => (
                <TextInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`DNS Name`}
                  placeholder={t`Enter DNS name`}
                  helptext={t`Enter the hostname label only (e.g., webserver01), without the domain. It will be combined with the DNS domain to form the full record (e.g., webserver01.example.com.)`}
                  errortext={field.state.meta.errors.map((e) => (typeof e === "string" ? e : e?.message)).join(", ")}
                  disabled={isPending}
                />
              )}
            />
          </FormSection>
          <FormSection className="mb-4">
            <form.Field
              name="description"
              validators={{
                onChange: ({ value }) =>
                  value.trim().length > 255 ? t`Description must be at most 255 characters.` : undefined,
              }}
              children={(field) => (
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  label={t`Description`}
                  helptext={t`Enter an optional description for the floating IP (max 255 characters).`}
                  errortext={field.state.meta.errors.map((e) => (typeof e === "string" ? e : e?.message)).join(", ")}
                  disabled={isPending}
                />
              )}
            />
          </FormSection>
          {canSpecifyIpAddress && (
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
                    helptext={t`Enter a floating IP or leave blank to auto-assign one`}
                    errortext={field.state.meta.errors.map((e) => e?.message).join(", ")}
                    disabled={isPending}
                  />
                )}
              />
            </FormSection>
          )}
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
