import { Fragment, ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { Stack, DescriptionList, DescriptionTerm, DescriptionDefinition } from "@cloudoperators/juno-ui-components"
import type { PortDetails } from "@/server/Network/types/port"
import ClipboardText from "@/client/components/ClipboardText"

interface PortDetailsViewProps {
  port: PortDetails
}

interface DetailItem {
  label: string
  value: ReactNode
}

const DetailsList = ({ items, keyPrefix }: { items: DetailItem[]; keyPrefix: string }) => (
  <DescriptionList alignTerms="right">
    {items.map(({ label, value }, index) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        <DescriptionTerm>{label}</DescriptionTerm>
        <DescriptionDefinition>
          <div className="break-all">{value}</div>
        </DescriptionDefinition>
      </Fragment>
    ))}
  </DescriptionList>
)

/** Name (if known) on top, the copyable ID below in a lighter color. */
const NamedResource = ({ name, id }: { name?: string; id: string }) => (
  <Stack direction="vertical" gap="0.5">
    {name && <span>{name}</span>}
    <ClipboardText text={id} className={name ? "text-theme-light text-sm" : undefined} />
  </Stack>
)

export function PortDetailsView({ port }: PortDetailsViewProps) {
  const { t } = useLingui()

  const items: DetailItem[] = [
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
                <Stack alignment="center" gap="1">
                  <ClipboardText text={fixedIp.ip_address} className="font-bold" />
                  {fixedIp.ip_version && <span className="text-theme-light">{`IPv${fixedIp.ip_version}`}</span>}
                </Stack>
                <NamedResource name={fixedIp.subnet_name} id={fixedIp.subnet_id} />
              </Stack>
            ))}
          </Stack>
        ) : (
          "—"
        ),
    },
    { label: t`Description`, value: port.description || "—" },
    { label: t`Name`, value: port.name || "—" },
    { label: t`Device Owner`, value: port.device_owner || "—" },
    { label: t`Device ID`, value: port.device_id ? <ClipboardText text={port.device_id} /> : "—" },
    { label: t`Created at`, value: port.created_at || "—" },
    { label: t`Updated at`, value: port.updated_at || "—" },
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
        ) : (
          "—"
        ),
    },
  ]

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <DetailsList items={items} keyPrefix="port" />
    </Stack>
  )
}
