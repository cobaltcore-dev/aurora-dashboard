import {
  Container,
  Stack,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Pill,
  Status,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { Server } from "@/server/Compute/types/server"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { powerStateLabel, EMPTY_VALUE } from "../-utils/instanceDisplay"
import { ImageNameHover } from "./ImageNameHover"
import { FlavorLink } from "./FlavorLink"

interface InstanceDetailsViewProps {
  instance: Server
  projectId: string
}

/**
 * Image ID cell: the copyable id with a name-resolving info icon, or
 * "Booted from volume" when Nova returns an empty image (volume-booted), or
 * "- -" when the field is absent entirely.
 */
function imageValue(instance: Server, projectId: string, bootedFromVolume: string) {
  const id = instance.image
  if (typeof id === "string" ? id : id?.id) {
    const imageId = typeof id === "string" ? id : (id?.id ?? "")
    return <ImageNameHover imageId={imageId} projectId={projectId} eager showIdAsLabel />
  }
  // image === "" means boot-from-volume; undefined/null means simply unknown.
  if (instance.image === "") return bootedFromVolume
  return ""
}

function OverviewSection({ instance, projectId }: { instance: Server; projectId: string }) {
  const { t } = useLingui()
  const tags = (instance.tags ?? []).filter((tag) => tag.trim() !== "")
  const items = [
    { label: t`ID`, value: <ClipboardText text={instance.id} /> },
    { label: t`Name`, value: instance.name },
    { label: t`Status`, value: instance.status },
    { label: t`Availability Zone`, value: instance["OS-EXT-AZ:availability_zone"] },
    { label: t`Flavor`, value: <FlavorLink instance={instance} projectId={projectId} /> },
    {
      label: t`Image ID`,
      value: imageValue(instance, projectId, t`Booted from volume`),
    },
    { label: t`Key Name`, value: instance.key_name },
    { label: t`Created`, value: instance.created },
    { label: t`Updated`, value: instance.updated },
    { label: t`Description`, value: instance.description },
    {
      label: t`Tags`,
      value:
        tags.length > 0 ? (
          <Stack gap="1" wrap={true} alignment="start" distribution="start" data-testid="instance-tags">
            {tags.map((tag) => (
              <Pill key={tag} pillValue={tag} />
            ))}
          </Stack>
        ) : undefined,
    },
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
    { label: t`Ephemeral Disk (GiB)`, value: instance.flavor?.ephemeral },
    { label: t`Swap (MiB)`, value: instance.flavor?.swap },
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

/** Metadata as a two-column key/value list. Not rendered when there is none. */
function MetadataSection({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const metadataItems = Object.entries(instance.metadata ?? {}).map(([key, value]) => ({ label: key, value }))
  if (metadataItems.length === 0) return null

  return (
    <Container px={false} py>
      <h2>{t`Metadata`}</h2>
      <TwoColumnDescriptionList items={metadataItems} />
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

export function InstanceDetailsView({ instance, projectId }: InstanceDetailsViewProps) {
  return (
    <Stack direction="vertical" gap="6">
      <OverviewSection instance={instance} projectId={projectId} />
      <StateSection instance={instance} />
      <HostSection instance={instance} />
      <MetadataSection instance={instance} />
      <AddressesSection instance={instance} />
    </Stack>
  )
}
