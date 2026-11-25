import { Button, Stack, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useVolumePermissions } from "@/client/hooks/useVolumePermissions"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList } from "@/client/components/TwoColumnDescriptionList"
import { StatusLabel } from "@/client/components/StatusLabel"
import ClipboardText from "@/client/components/ClipboardText"
import { SourceVolumeLink } from "./SourceVolumeLink"
import { RouteError } from "@/client/components/Errors/RouteError"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { Metadata } from "./Metadata"
import { formatCinderDate } from "../-utils/list"

export function SnapshotDetails({ projectId, snapshotId }: { projectId: string; snapshotId: string }) {
  const { t, i18n } = useLingui()
  const permissions = useVolumePermissions(projectId)
  const query = trpcReact.volume.getSnapshotById.useQuery(
    { project_id: projectId, snapshotId },
    {
      enabled: permissions.canReadSnapshots,
      retry: false,
      refetchOnReconnect: false,
    }
  )
  const snapshot = query.data
  useSetBreadcrumb("/_auth/projects/$projectId/volumes/snapshots/$snapshotId", snapshot?.name || snapshotId)
  if (permissions.isPending) return <Status status="progress" title={t`Loading Permissions...`} />
  if (
    permissions.error?.data?.code === "FORBIDDEN" ||
    query.error?.data?.code === "FORBIDDEN" ||
    (!permissions.error && !permissions.canReadSnapshots)
  )
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view snapshots in this project.`}
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
  if (query.isPending) return <Status status="progress" title={t`Loading Snapshot Details...`} />
  if (query.error?.data?.code === "NOT_FOUND")
    return <RouteIdLevelDefaultError errorTitle={t`Resource Not Accessible`} />
  if (query.error || !snapshot)
    return (
      <Stack direction="vertical">
        <RouteError
          error={query.error}
          title={query.error?.data?.code === "UNAUTHORIZED" ? t`Session Expired` : t`Failed to Load Snapshot`}
        />
        <Button size="xs" label={t`Try again`} onClick={() => void query.refetch()} />
      </Stack>
    )
  return (
    <Stack direction="vertical" gap="6" data-testid="snapshot-detail">
      <ContentHeader title={snapshot.name || snapshot.id} projectId={projectId} />
      <TwoColumnDescriptionList
        items={[
          { label: t`Name`, value: snapshot.name },
          { label: t`ID`, value: <ClipboardText text={snapshot.id} /> },
          { label: t`Status`, value: <StatusLabel value={snapshot.status} /> },
          { label: t`Size (GiB)`, value: snapshot.size },
          {
            label: t`Description`,
            value: snapshot.description ? (
              <span className="break-words whitespace-normal">{snapshot.description}</span>
            ) : undefined,
          },
          { label: t`Created`, value: formatCinderDate(snapshot.created_at, i18n.locale) },
          { label: t`Updated`, value: formatCinderDate(snapshot.updated_at, i18n.locale) },
          { label: t`Source volume`, value: <SourceVolumeLink id={snapshot.volume_id} copyable /> },
        ]}
      />
      {Object.keys(snapshot.metadata ?? {}).length > 0 && (
        <Stack direction="vertical" gap="2">
          <h2>{t`Metadata`}</h2>
          <Metadata value={snapshot.metadata} />
        </Stack>
      )}
    </Stack>
  )
}
