import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  Button,
  ContentHeading,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { formatFloatingIpStatus } from "@/client/utils/formatFloatingIpStatus"
import type { DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
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
      <ContentHeader
        title={floatingIp.floating_ip_address ?? floatingIp.id}
        projectId={floatingIp.project_id}
        description={t`Full lifecycle management of Floating IPs, including attachment, port association/disassociation, DNS settings, and deletion`}
        actions={
          <FloatingIpActionModals floatingIp={floatingIp}>
            {({ toggleEditModal, toggleAttachModal, toggleDetachModal, toggleReleaseModal }) => (
              <Stack gap="0.5" alignment="center">
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button icon="moreVert" title={t`Floating IP actions`} />
                  </PopupMenuToggle>
                  <PopupMenuOptions>
                    <PopupMenuItem label={t`Edit Description`} onClick={toggleEditModal} />
                    <PopupMenuItem label={t`Detach`} onClick={toggleDetachModal} />
                    <PopupMenuItem label={t`Release`} onClick={toggleReleaseModal} />
                  </PopupMenuOptions>
                </PopupMenu>
                <Button variant="primary" className="whitespace-nowrap" onClick={toggleAttachModal}>
                  {t`Attach`}
                </Button>
              </Stack>
            )}
          </FloatingIpActionModals>
        }
      />

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
