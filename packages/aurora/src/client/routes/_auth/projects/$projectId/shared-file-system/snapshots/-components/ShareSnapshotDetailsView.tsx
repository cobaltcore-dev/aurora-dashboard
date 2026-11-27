import { useLingui } from "@lingui/react/macro"
import { Stack } from "@cloudoperators/juno-ui-components"
import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import ClipboardText from "@/client/components/ClipboardText"
import { StatusLabel } from "@/client/components/StatusLabel"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import { parseManilaTimestamp } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"
import { SharedFileSystemIdLink } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemIdLink"
import { getShareSnapshotProtocolLabel } from "./shareSnapshotDetailUtils"

interface ShareSnapshotDetailsViewProps {
  snapshot: ShareSnapshot
  projectId: string
}

export function ShareSnapshotDetailsView({ snapshot, projectId }: ShareSnapshotDetailsViewProps) {
  const { t } = useLingui()

  const items: DetailListItem[] = [
    { label: t`Name`, value: snapshot.name },
    { label: t`ID`, value: <ClipboardText text={snapshot.id} /> },
    { label: t`Status`, value: <StatusLabel value={snapshot.status} /> },
    { label: t`Size (GiB)`, value: snapshot.size },
    { label: t`Protocol`, value: getShareSnapshotProtocolLabel(snapshot.share_proto) },
    { label: t`Description`, value: snapshot.description },
    { label: t`Created`, value: parseManilaTimestamp(snapshot.created_at)?.toLocaleString() },
    {
      label: t`Source Share`,
      value: snapshot.share_id ? (
        <SharedFileSystemIdLink target="share" id={snapshot.share_id} projectId={projectId} />
      ) : undefined,
    },
    // Admin-only field: shown when available, hidden (- -) otherwise
    { label: t`Provider Location`, value: snapshot.provider_location },
  ]

  return (
    <Stack direction="vertical" gap="6" className="mt-6">
      <TwoColumnDescriptionList items={items} />
    </Stack>
  )
}
