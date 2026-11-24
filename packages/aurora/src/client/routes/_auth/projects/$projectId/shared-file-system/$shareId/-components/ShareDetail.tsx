import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Status } from "@cloudoperators/juno-ui-components"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { getShareDisplayName } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListUtils"
import { SharedFileSystemDetailLoadError } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemDetailLoadError"
import { ShareDetailsView } from "./ShareDetailsView"
import type { ShareDetailsTab } from "./shareDetailUtils"

interface ShareLoadErrorProps {
  error: unknown
  onRetry: () => void
}

/**
 * Error state for the share details, shared by the route error component and the query error state.
 */
export function ShareLoadError({ error, onRetry }: ShareLoadErrorProps) {
  const { t } = useLingui()
  return (
    <SharedFileSystemDetailLoadError
      error={error}
      onRetry={onRetry}
      notFoundTitle={t`Share Not Found`}
      notFoundDescription={t`This share does not exist or is not accessible in this project.`}
      forbiddenDescription={t`You don't have permission to view this share.`}
      errorTitle={t`Error Loading Share`}
      errorDescription={t`The share could not be loaded. Try again.`}
    />
  )
}

interface ShareDetailProps {
  projectId: string
  shareId: string
  routeId: string
  activeTab: ShareDetailsTab
  onTabChange: (tab: ShareDetailsTab) => void
}

export function ShareDetail({ projectId, shareId, routeId, activeTab, onTabChange }: ShareDetailProps) {
  const { t } = useLingui()

  const {
    data: share,
    status,
    error,
    refetch,
  } = trpcReact.sharedFileSystem.getShareById.useQuery({ project_id: projectId, shareId }, { retry: false })

  // Set breadcrumb before any early return: show the ID while loading/error, the name on success
  useSetBreadcrumb(routeId, share ? getShareDisplayName(share) : shareId)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Share Details...`} />
  }

  if (status === "error") {
    return <ShareLoadError error={error} onRetry={() => void refetch()} />
  }

  return (
    <>
      <ContentHeader title={getShareDisplayName(share)} projectId={projectId} />
      <ShareDetailsView share={share} projectId={projectId} activeTab={activeTab} onTabChange={onTabChange} />
    </>
  )
}
