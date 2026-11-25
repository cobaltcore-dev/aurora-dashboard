import {
  Button,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Status,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { StatusLabel } from "@/client/components/StatusLabel"
import ClipboardText from "@/client/components/ClipboardText"
import { RouteError } from "@/client/components/Errors/RouteError"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { ResourceLink } from "../../-components/ResourceLink"
import { ResourceTable } from "../../-components/ResourceTable"
import { Metadata } from "../../-components/Metadata"
import { formatCinderDate } from "../../-utils/list"

export function VolumeDetails({ projectId, volumeId }: { projectId: string; volumeId: string }) {
  const { t, i18n } = useLingui()
  const permissions = useVolumePermissions(projectId)
  const volumeQuery = trpcReact.volume.getVolumeById.useQuery(
    { project_id: projectId, volumeId },
    {
      enabled: permissions.canReadVolumes,
      retry: false,
      refetchOnReconnect: false,
    }
  )
  // Resolve optional relationships before revealing the initial detail layout.
  const snapshotsQuery = trpcReact.volume.listSnapshots.useQuery(
    { project_id: projectId, volumeId },
    {
      enabled: permissions.canReadVolumes && permissions.canListSnapshots && volumeQuery.isSuccess,
      retry: false,
      refetchOnReconnect: false,
    }
  )
  const volume = volumeQuery.data
  useSetBreadcrumb("/_auth/projects/$projectId/volumes/$volumeId/", volume?.name || volumeId)

  if (permissions.isPending) return <Status status="progress" title={t`Loading Permissions...`} />
  if (
    permissions.error?.data?.code === "FORBIDDEN" ||
    volumeQuery.error?.data?.code === "FORBIDDEN" ||
    (!permissions.error && !permissions.canReadVolumes)
  )
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view volumes in this project.`}
      />
    )
  if (permissions.error)
    return (
      <Stack direction="vertical">
        <RouteError
          error={permissions.error}
          title={permissions.error.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Permissions`}
        />
        <Button size="xs" label={t`Try again`} onClick={() => void permissions.refetch()} />
      </Stack>
    )
  if (volumeQuery.isPending) return <Status status="progress" title={t`Loading Volume Details...`} />
  if (volumeQuery.error?.data?.code === "NOT_FOUND")
    return <RouteIdLevelDefaultError errorTitle={t`Resource Not Accessible`} />
  if (volumeQuery.error || !volume)
    return (
      <Stack direction="vertical">
        <RouteError
          error={volumeQuery.error}
          title={volumeQuery.error?.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Volume`}
        />
        <Button size="xs" label={t`Try again`} onClick={() => void volumeQuery.refetch()} />
      </Stack>
    )

  // A pending collection is not yet known to be empty. Keep one loading state
  // rather than briefly mounting a section that disappears when it resolves.
  // Background refetches retain data and do not return to the pending state.
  if (permissions.canListSnapshots && snapshotsQuery.isPending)
    return <Status status="progress" title={t`Loading Volume Details...`} />

  const boolean = (value: boolean | null | undefined) => (value == null ? "- -" : value ? t`Yes` : t`No`)
  const attachments = volume.attachments ?? []
  const hasAttachments = attachments.length > 0
  // Only a successful empty response proves there are no snapshots.
  const showSnapshots =
    !permissions.canListSnapshots || Boolean(snapshotsQuery.error) || Boolean(snapshotsQuery.data?.length)
  return (
    <Stack direction="vertical" gap="6" data-testid="volume-detail">
      <ContentHeader title={volume.name || volume.id} projectId={projectId} />
      <TwoColumnDescriptionList
        items={[
          { label: t`Name`, value: volume.name },
          { label: t`ID`, value: <ClipboardText text={volume.id} /> },
          { label: t`Status`, value: <StatusLabel value={volume.status} /> },
          { label: t`Size (GiB)`, value: volume.size },
          { label: t`Availability Zone`, value: volume.availability_zone },
          { label: t`Volume type`, value: volume.volume_type },
          { label: t`Bootable`, value: boolean(volume.bootable) },
          { label: t`Encrypted`, value: boolean(volume.encrypted) },
          { label: t`Multiattach`, value: boolean(volume.multiattach) },
          {
            label: t`Description`,
            value: volume.description ? (
              <span className="break-words whitespace-normal">{volume.description}</span>
            ) : undefined,
          },
          { label: t`Created`, value: formatCinderDate(volume.created_at, i18n.locale) },
          { label: t`Updated`, value: formatCinderDate(volume.updated_at, i18n.locale) },
        ]}
      />
      {Object.keys(volume.metadata ?? {}).length > 0 && (
        <Stack direction="vertical" gap="2">
          <h2>{t`Metadata`}</h2>
          <Metadata value={volume.metadata} />
        </Stack>
      )}
      {(volume.snapshot_id || volume.source_volid) && (
        <Stack direction="vertical" gap="2">
          <h2>{t`Source`}</h2>
          <TwoColumnDescriptionList
            items={[
              ...(volume.snapshot_id
                ? [
                    {
                      label: t`Source snapshot`,
                      value: <ResourceLink resource="snapshot" id={volume.snapshot_id} copyable />,
                    },
                  ]
                : []),
              ...(volume.source_volid
                ? [
                    {
                      label: t`Source volume`,
                      value: <ResourceLink resource="volume" id={volume.source_volid} copyable />,
                    },
                  ]
                : []),
            ]}
          />
        </Stack>
      )}
      {hasAttachments && (
        <Stack direction="vertical" gap="2">
          <h2>{t`Attachments`}</h2>
          <DataGrid columns={4} data-testid="attachments-table">
            <DataGridRow>
              <DataGridHeadCell>{t`Server ID`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Device`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Attachment ID`}</DataGridHeadCell>
              <DataGridHeadCell>{t`Attached at`}</DataGridHeadCell>
            </DataGridRow>
            {attachments.map((attachment, index) => (
              <DataGridRow key={attachment.attachment_id || index}>
                <DataGridCell textContain="break-word">
                  <ResourceLink resource="instance" id={attachment.server_id} copyable />
                </DataGridCell>
                <DataGridCell>{attachment.device || "- -"}</DataGridCell>
                <DataGridCell textContain="break-word">
                  {attachment.attachment_id ? <ClipboardText text={attachment.attachment_id} selectable /> : "- -"}
                </DataGridCell>
                <DataGridCell>{formatCinderDate(attachment.attached_at, i18n.locale)}</DataGridCell>
              </DataGridRow>
            ))}
          </DataGrid>
        </Stack>
      )}
      {showSnapshots && (
        <Stack direction="vertical" gap="2">
          <h2>{t`Snapshots of this volume`}</h2>
          {!permissions.canListSnapshots ? (
            <Status
              status="error"
              title={t`Access Denied`}
              body={t`You don't have permission to view snapshots in this project.`}
            />
          ) : snapshotsQuery.error?.data?.code === "FORBIDDEN" ? (
            <Status
              status="error"
              title={t`Access Denied`}
              body={t`You don't have permission to view snapshots in this project.`}
            />
          ) : snapshotsQuery.error ? (
            <Stack direction="vertical">
              <RouteError
                error={snapshotsQuery.error}
                title={
                  snapshotsQuery.error.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Snapshots`
                }
              />
              <Button size="xs" label={t`Try again`} onClick={() => void snapshotsQuery.refetch()} />
            </Stack>
          ) : (
            <ResourceTable
              items={snapshotsQuery.data ?? []}
              snapshots
              compact
              projectId={projectId}
              canRead={permissions.canReadSnapshots}
            />
          )}
        </Stack>
      )}
    </Stack>
  )
}
