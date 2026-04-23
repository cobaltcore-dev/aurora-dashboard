import { Trans, useLingui } from "@lingui/react/macro"
import {
  Stack,
  ButtonRow,
  Button,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
  ContentHeading,
} from "@cloudoperators/juno-ui-components/index"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { formatFloatingIpStatus } from "@/client/utils/formatFloatingIpStatus"
import { FloatingIpActionModals } from "../-modals/FloatingIpActionModals"

interface FloatingIpDetailsViewProps {
  floatingIp: FloatingIp
}

export const FloatingIpDetailsView = ({ floatingIp }: FloatingIpDetailsViewProps) => {
  const { t } = useLingui()

  return (
    <>
      <ContentHeading>
        {t`IP:`} {floatingIp.floating_ip_address}
      </ContentHeading>
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

      <Stack direction="vertical" gap="6" className="mt-6">
        {/* Basic Info  */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Basic Info</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            <DescriptionTerm>{t`ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.id}</DescriptionDefinition>

            <DescriptionTerm>{t`Description`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.description || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Project ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.project_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Status`}</DescriptionTerm>
            <DescriptionDefinition>{formatFloatingIpStatus(floatingIp.status)}</DescriptionDefinition>

            <DescriptionTerm>{t`Created At`}</DescriptionTerm>
            <DescriptionDefinition>
              {floatingIp.created_at ? new Date(floatingIp.created_at).toLocaleString() : `—`}
            </DescriptionDefinition>

            <DescriptionTerm>{t`Updated At`}</DescriptionTerm>
            <DescriptionDefinition>
              {floatingIp.updated_at ? new Date(floatingIp.updated_at).toLocaleString() : `—`}
            </DescriptionDefinition>

            <DescriptionTerm>{t`Tags`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.tags?.join(", ") || `—`}</DescriptionDefinition>
          </DescriptionList>
        </Stack>
        {/* Network & Routing  */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>Network & Routing</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            <DescriptionTerm>{t`Floating IP Address`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.floating_ip_address || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Floating Network`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.floating_network_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Fixed IP Address`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.fixed_ip_address || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Port Name`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_details?.name || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`MAC Address`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_details?.mac_address || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Network ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_details?.network_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Device Owner`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_details?.device_owner || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Device ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_details?.device_id || `—`}</DescriptionDefinition>
            <DescriptionTerm>{t`Router ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.router_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Port ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.port_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`QoS Policy ID`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.qos_policy_id || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`Port Forwarding`}</DescriptionTerm>
            <DescriptionDefinition>
              {floatingIp.port_forwardings?.map((port) => port.id).join(", ") || `—`}
            </DescriptionDefinition>
          </DescriptionList>
        </Stack>
        {/* DNS */}
        <Stack direction="vertical" gap="2">
          <ContentHeading>
            <Trans>DNS</Trans>
          </ContentHeading>
          <DescriptionList alignTerms="right">
            <DescriptionTerm>{t`DNS Domain`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.dns_domain || `—`}</DescriptionDefinition>

            <DescriptionTerm>{t`DNS Name`}</DescriptionTerm>
            <DescriptionDefinition>{floatingIp.dns_name || `—`}</DescriptionDefinition>
          </DescriptionList>
        </Stack>
      </Stack>
    </>
  )
}
