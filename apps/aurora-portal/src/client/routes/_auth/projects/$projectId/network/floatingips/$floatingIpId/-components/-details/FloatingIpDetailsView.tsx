import { Trans, useLingui } from "@lingui/react/macro"
import { Stack, ButtonRow, Button, ContentHeading } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { formatFloatingIpStatus } from "@/client/utils/formatFloatingIpStatus"
import { DetailListItem, TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { FloatingIpActionModals } from "../../../-components/-modals/FloatingIpActionModals"

interface FloatingIpDetailsViewProps {
  floatingIp: FloatingIp
}

export const FloatingIpDetailsView = ({ floatingIp }: FloatingIpDetailsViewProps) => {
  const { t } = useLingui()

  const basicInfoItems: DetailListItem[] = [
    { label: t`ID`, value: floatingIp.id },
    { label: t`Description`, value: floatingIp.description || `—` },
    { label: t`Project ID`, value: floatingIp.project_id || `—` },
    { label: t`Status`, value: formatFloatingIpStatus(floatingIp.status) },
    { label: t`Created At`, value: floatingIp.created_at ? new Date(floatingIp.created_at).toLocaleString() : `—` },
    { label: t`Updated At`, value: floatingIp.updated_at ? new Date(floatingIp.updated_at).toLocaleString() : `—` },
    { label: t`Tags`, value: floatingIp.tags?.join(", ") || `—` },
  ]

  const networkRoutingItems: DetailListItem[] = [
    { label: t`Floating IP Address`, value: floatingIp.floating_ip_address || `—` },
    { label: t`Floating Network`, value: floatingIp.floating_network_id || `—` },
    { label: t`Fixed IP Address`, value: floatingIp.fixed_ip_address || `—` },
    { label: t`Port Name`, value: floatingIp.port_details?.name || `—` },
    { label: t`MAC Address`, value: floatingIp.port_details?.mac_address || `—` },
    { label: t`Network ID`, value: floatingIp.port_details?.network_id || `—` },
    { label: t`Device Owner`, value: floatingIp.port_details?.device_owner || `—` },
    { label: t`Device ID`, value: floatingIp.port_details?.device_id || `—` },
    { label: t`Router ID`, value: floatingIp.router_id || `—` },
    { label: t`Port ID`, value: floatingIp.port_id || `—` },
    { label: t`QoS Policy ID`, value: floatingIp.qos_policy_id || `—` },
    { label: t`Port Forwarding`, value: floatingIp.port_forwardings?.map((port) => port.id).join(", ") || `—` },
  ]

  const dnsItems: DetailListItem[] = [
    { label: t`DNS Domain`, value: floatingIp.dns_domain || `—` },
    { label: t`DNS Name`, value: floatingIp.dns_name || `—` },
  ]

  return (
    <>
      <p className="text-theme-secondary mt-2 text-sm">
        <Trans>
          Full lifecycle management of Floating IPs, including attachment, port association/disassociation, DNS
          settings, and deletion
        </Trans>
      </p>

      <FloatingIpActionModals floatingIp={floatingIp}>
        {({ toggleEditModal, toggleAttachModal, toggleDetachModal, toggleReleaseModal }) => (
          <ButtonRow>
            <Button onClick={toggleEditModal}>{t`Edit Description`}</Button>
            <Button onClick={toggleAttachModal}>{t`Attach`}</Button>
            <Button onClick={toggleDetachModal}>{t`Detach`}</Button>
            <Button onClick={toggleReleaseModal}>{t`Release`}</Button>
          </ButtonRow>
        )}
      </FloatingIpActionModals>

      <Stack direction="vertical" gap="6" className="my-6">
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Basic Info</Trans>
          </ContentHeading>
          <TwoColumnDescriptionList items={basicInfoItems} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Network & Routing</Trans>
          </ContentHeading>
          <TwoColumnDescriptionList items={networkRoutingItems} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>DNS</Trans>
          </ContentHeading>
          <TwoColumnDescriptionList items={dnsItems} />
        </Stack>
      </Stack>
    </>
  )
}
