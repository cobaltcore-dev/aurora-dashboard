import {
  Button,
  Container,
  Message,
  Stack,
  DataGrid,
  DataGridHeadCell,
  DataGridRow,
  DataGridCell,
  Pill,
  Status,
} from "@cloudoperators/juno-ui-components"
import { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import type { Server } from "@/server/Compute/types/server"
import ClipboardText from "@/client/components/ClipboardText"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { powerStateLabel, EMPTY_VALUE, rawImageId } from "../-utils/instanceDisplay"
import { ImageNameLink } from "./ImageNameLink"
import { FlavorLink } from "./FlavorLink"
import { StatusLabel } from "@/client/components/StatusLabel"

interface InstanceDetailsViewProps {
  instance: Server
  projectId: string
}

/**
 * Error banner for an instance in the ERROR state. Nova reports the reason in `fault`;
 * show its message (and code when present). The optional, often lengthy `details`
 * (a stack trace) is tucked behind a toggle so it does not flood the view.
 */
function FaultMessage({ instance }: { instance: Server }) {
  const { t } = useLingui()
  const [showDetails, setShowDetails] = useState(false)
  const message = instance.fault?.message?.trim()
  if (instance.status !== "ERROR" || !message) return null

  const code = instance.fault?.code
  const details = instance.fault?.details?.trim()

  return (
    <Message variant="error" title={code != null ? t`Error ${code}` : t`Error`} data-testid="instance-fault">
      <Stack direction="vertical" gap="2" alignment="start">
        <span>{message}</span>
        {details && (
          <>
            <Button
              size="xs"
              variant="subdued"
              label={showDetails ? t`Hide Details` : t`Show Details`}
              onClick={() => setShowDetails((v) => !v)}
            />
            {showDetails && (
              <pre
                data-testid="instance-fault-details"
                className="text-theme-default bg-theme-background-lvl-1 max-h-64 w-full overflow-auto rounded p-2 text-xs whitespace-pre-wrap"
              >
                {details}
              </pre>
            )}
          </>
        )}
      </Stack>
    </Message>
  )
}

/**
 * Image Name cell: the resolved name linking to the image, "Booted from volume"
 * when Nova returns an empty image (volume-booted), or "- -" when the field is
 * absent or the image isn't accessible in this project.
 */
function imageNameValue(instance: Server, projectId: string, bootedFromVolume: string) {
  const id = rawImageId(instance)
  if (id) return <ImageNameLink imageId={id} projectId={projectId} />
  // image === "" means boot-from-volume; undefined/null means simply unknown.
  if (instance.image === "") return bootedFromVolume
  return undefined
}

function OverviewSection({ instance, projectId }: { instance: Server; projectId: string }) {
  const { t } = useLingui()
  const tags = (instance.tags ?? []).filter((tag) => tag.trim() !== "")
  const imageId = rawImageId(instance)
  const items = [
    { label: t`ID`, value: <ClipboardText text={instance.id} /> },
    { label: t`Name`, value: instance.name },
    { label: t`Status`, value: <StatusLabel value={instance.status} /> },
    { label: t`Availability Zone`, value: instance["OS-EXT-AZ:availability_zone"] },
    {
      label: t`Image Name`,
      value: imageNameValue(instance, projectId, t`Booted from volume`),
    },
    {
      label: t`Image ID`,
      value: imageId ? <ClipboardText text={imageId} /> : undefined,
    },
    { label: t`Flavor`, value: <FlavorLink instance={instance} projectId={projectId} /> },
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
    { label: t`Power State`, value: <StatusLabel value={powerStateLabel(instance["OS-EXT-STS:power_state"])} /> },
    { label: t`VM State`, value: <StatusLabel value={instance["OS-EXT-STS:vm_state"]} /> },
    { label: t`Task State`, value: <StatusLabel value={instance["OS-EXT-STS:task_state"]} /> },
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
      <FaultMessage instance={instance} />
      <OverviewSection instance={instance} projectId={projectId} />
      <StateSection instance={instance} />
      <HostSection instance={instance} />
      <MetadataSection instance={instance} />
      <AddressesSection instance={instance} />
    </Stack>
  )
}
