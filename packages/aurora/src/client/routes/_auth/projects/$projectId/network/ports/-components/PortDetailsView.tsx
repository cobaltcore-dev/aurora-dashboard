import { useLingui } from "@lingui/react/macro"
import { Stack } from "@cloudoperators/juno-ui-components"
import type { PortDetails } from "@/server/Network/types/port"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"

interface PortDetailsViewProps {
  port: PortDetails
}

/** Name (if known) on top, the copyable ID below in a lighter color. */
const NamedResource = ({ name, id }: { name?: string; id: string }) => (
  <Stack direction="vertical" gap="0.5">
    {name && <span>{name}</span>}
    <ClipboardText text={id} className={name ? "text-theme-light text-sm" : undefined} />
  </Stack>
)

export function PortDetailsView({ port }: PortDetailsViewProps) {
  const { t } = useLingui()

  const items: DetailListItem[] = [
    { label: t`Port ID`, value: <ClipboardText text={port.id} /> },
    { label: t`MAC`, value: <ClipboardText text={port.mac_address} /> },
    { label: t`Network`, value: <NamedResource name={port.network_name} id={port.network_id} /> },
    {
      label: t`IPs`,
      value:
        port.fixed_ips.length > 0 ? (
          <Stack direction="vertical" gap="2" data-testid="port-fixed-ips">
            {port.fixed_ips.map((fixedIp) => (
              <Stack key={`${fixedIp.subnet_id}-${fixedIp.ip_address}`} direction="vertical" gap="0.5">
                <ClipboardText text={fixedIp.ip_address} className="font-bold" />
                {fixedIp.subnet_name ? (
                  <span className="text-theme-light text-sm">{fixedIp.subnet_name}</span>
                ) : (
                  <ClipboardText text={fixedIp.subnet_id} className="text-theme-light text-sm" />
                )}
              </Stack>
            ))}
          </Stack>
        ) : undefined,
    },
    { label: t`Description`, value: port.description || undefined },
    { label: t`Name`, value: port.name || undefined },
    { label: t`Device Owner`, value: port.device_owner || undefined },
    { label: t`Device ID`, value: port.device_id ? <ClipboardText text={port.device_id} /> : undefined },
    { label: t`Created At`, value: port.created_at },
    { label: t`Updated At`, value: port.updated_at },
    { label: t`Project ID`, value: <ClipboardText text={port.project_id} /> },
    { label: t`Status`, value: port.status },
    {
      label: t`Security Groups`,
      value:
        port.security_groups.length > 0 ? (
          <Stack direction="vertical" gap="2" data-testid="port-security-groups">
            {port.security_groups.map((securityGroup) => (
              <NamedResource key={securityGroup.id} name={securityGroup.name} id={securityGroup.id} />
            ))}
          </Stack>
        ) : undefined,
    },
  ]

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList items={items} />
    </Stack>
  )
}
