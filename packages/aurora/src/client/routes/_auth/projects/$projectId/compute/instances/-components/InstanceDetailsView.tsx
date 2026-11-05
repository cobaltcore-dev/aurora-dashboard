import {
  Container,
  Stack,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Status,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { Server } from "@/server/Compute/types/server"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { flavorName, imageId, powerStateLabel, EMPTY_VALUE } from "../-utils/instanceDisplay"

interface InstanceDetailsViewProps {
  instance: Server
}

function OverviewSection({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const items = [
    { label: t`ID`, value: <ClipboardText text={instance.id} /> },
    { label: t`Name`, value: instance.name },
    { label: t`Status`, value: instance.status },
    { label: t`Availability Zone`, value: instance["OS-EXT-AZ:availability_zone"] },
    { label: t`Flavor`, value: flavorName(instance) },
    { label: t`Image ID`, value: imageId(instance) },
    { label: t`Key Name`, value: instance.key_name },
    { label: t`Created`, value: instance.created },
    { label: t`Updated`, value: instance.updated },
    { label: t`Description`, value: instance.description },
  ]
  return (
    <Container px={false} py>
      <h2>{t`General Instance Data`}</h2>
      <TwoColumnDescriptionList items={items} />
    </Container>
  )
}

function StateSection({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const items = [
    { label: t`Power State`, value: powerStateLabel(instance["OS-EXT-STS:power_state"]) },
    { label: t`VM State`, value: instance["OS-EXT-STS:vm_state"] },
    { label: t`Task State`, value: instance["OS-EXT-STS:task_state"] },
    { label: t`vCPUs`, value: instance.flavor?.vcpus },
    { label: t`RAM (MiB)`, value: instance.flavor?.ram },
    { label: t`Root Disk (GiB)`, value: instance.flavor?.disk },
  ]
  return (
    <Container px={false} py>
      <h2>{t`Compute & State`}</h2>
      <TwoColumnDescriptionList items={items} />
    </Container>
  )
}

/** Host-level attributes only render when present. */
function HostSection({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const host = instance["OS-EXT-SRV-ATTR:host"]
  const hypervisor = instance["OS-EXT-SRV-ATTR:hypervisor_hostname"]
  const instanceName = instance["OS-EXT-SRV-ATTR:instance_name"]
  if (host == null && hypervisor == null && instanceName == null) return null

  const items = [
    ...(host != null ? [{ label: t`Host`, value: host }] : []),
    ...(hypervisor != null ? [{ label: t`Hypervisor`, value: hypervisor }] : []),
    ...(instanceName != null ? [{ label: t`Instance Name`, value: instanceName }] : []),
  ]
  return (
    <Container px={false} py>
      <h2>{t`Host`}</h2>
      <TwoColumnDescriptionList items={items} />
    </Container>
  )
}

function AddressesSection({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const addressGroups = Object.entries(instance.addresses ?? {})

  return (
    <Container px={false} py>
      <h2>{t`Addresses`}</h2>
      {addressGroups.length > 0 ? (
        <Stack direction="vertical" gap="4">
          {addressGroups.map(([network, addresses]) => (
            <Stack key={network} direction="vertical" gap="1">
              <h3 className="text-theme-high break-all">{network}</h3>
              <DataGrid columns={4} data-testid={`instance-addresses-${network}`}>
                <DataGridRow>
                  <DataGridHeadCell>{t`IP Address`}</DataGridHeadCell>
                  <DataGridHeadCell>{t`Version`}</DataGridHeadCell>
                  <DataGridHeadCell>{t`MAC Address`}</DataGridHeadCell>
                  <DataGridHeadCell>{t`Type`}</DataGridHeadCell>
                </DataGridRow>
                {addresses.map((address, index) => (
                  <DataGridRow key={`${address.addr ?? "addr"}-${index}`}>
                    <DataGridCell>{address.addr ? <ClipboardText text={address.addr} /> : EMPTY_VALUE}</DataGridCell>
                    <DataGridCell>{address.version ? `IPv${address.version}` : EMPTY_VALUE}</DataGridCell>
                    <DataGridCell>{address.mac_addr || EMPTY_VALUE}</DataGridCell>
                    <DataGridCell>{address.type || EMPTY_VALUE}</DataGridCell>
                  </DataGridRow>
                ))}
              </DataGrid>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Status status="empty" title={t`No addresses`} body={t`This instance has no network addresses.`} />
      )}
    </Container>
  )
}

export function InstanceDetailsView({ instance }: InstanceDetailsViewProps) {
  return (
    <Stack direction="vertical" gap="6">
      <OverviewSection instance={instance} />
      <StateSection instance={instance} />
      <HostSection instance={instance} />
      <AddressesSection instance={instance} />
    </Stack>
  )
}
