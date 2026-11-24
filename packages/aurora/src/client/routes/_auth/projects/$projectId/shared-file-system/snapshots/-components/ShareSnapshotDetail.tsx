import { useLingui } from "@lingui/react/macro"
import { Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { SharedFileSystemDetailLoadError } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemDetailLoadError"
import { ShareSnapshotDetailsView } from "./ShareSnapshotDetailsView"
import { getShareSnapshotDisplayName } from "./shareSnapshotDetailUtils"

interface ShareSnapshotLoadErrorProps {
  error: unknown
  onRetry: () => void
}

export function ShareSnapshotLoadError({ error, onRetry }: ShareSnapshotLoadErrorProps) {
  const { t } = useLingui()
  return (
    <SharedFileSystemDetailLoadError
      error={error}
      onRetry={onRetry}
      notFoundTitle={t`Share Snapshot Not Found`}
      notFoundDescription={t`This share snapshot does not exist or is not accessible in this project.`}
      forbiddenDescription={t`You don't have permission to view this share snapshot.`}
      errorTitle={t`Error Loading Share Snapshot`}
      errorDescription={t`The share snapshot could not be loaded. Try again.`}
    />
  )
}

interface ShareSnapshotDetailProps {
  projectId: string
  snapshotId: string
  routeId: string
}

export function ShareSnapshotDetail({ projectId, snapshotId, routeId }: ShareSnapshotDetailProps) {
  const { t } = useLingui()

  const {
    data: snapshot,
    status,
    error,
    refetch,
  } = trpcReact.sharedFileSystem.getSnapshotById.useQuery({ project_id: projectId, snapshotId }, { retry: false })

  // Set breadcrumb before any early return: the ID while loading/error, the name on success
  useSetBreadcrumb(routeId, snapshot ? getShareSnapshotDisplayName(snapshot) : snapshotId)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Share Snapshot Details...`} />
  }

  if (status === "error") {
    return <ShareSnapshotLoadError error={error} onRetry={() => void refetch()} />
  }

  return (
    <>
      <ContentHeader title={getShareSnapshotDisplayName(snapshot)} projectId={projectId} />
      <ShareSnapshotDetailsView snapshot={snapshot} projectId={projectId} />
    </>
  )
}
