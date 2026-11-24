import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Status } from "@cloudoperators/juno-ui-components"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { getShareNetworkDisplayName } from "@/client/routes/_auth/projects/$projectId/shared-file-system/share-networks/-components/shareNetworkListUtils"
import { SharedFileSystemDetailLoadError } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/SharedFileSystemDetailLoadError"
import { ShareNetworkDetailsView } from "./ShareNetworkDetailsView"
import type { ShareNetworkDetailsTab } from "./shareNetworkDetailUtils"

interface ShareNetworkLoadErrorProps {
  error: unknown
  onRetry: () => void
}

/**
 * Error state for the share network details, shared by the route error component and the query error state.
 */
export function ShareNetworkLoadError({ error, onRetry }: ShareNetworkLoadErrorProps) {
  const { t } = useLingui()
  return (
    <SharedFileSystemDetailLoadError
      error={error}
      onRetry={onRetry}
      backTarget="share-networks"
      notFoundTitle={t`Share Network Not Found`}
      notFoundDescription={t`This share network does not exist or is not accessible in this project.`}
      forbiddenDescription={t`You don't have permission to view this share network.`}
      errorTitle={t`Error Loading Share Network`}
      errorDescription={t`The share network could not be loaded. Try again.`}
    />
  )
}

interface ShareNetworkDetailProps {
  projectId: string
  shareNetworkId: string
  routeId: string
  activeTab: ShareNetworkDetailsTab
  onTabChange: (tab: ShareNetworkDetailsTab) => void
}

export function ShareNetworkDetail({
  projectId,
  shareNetworkId,
  routeId,
  activeTab,
  onTabChange,
}: ShareNetworkDetailProps) {
  const { t } = useLingui()

  const {
    data: shareNetwork,
    status,
    error,
    refetch,
  } = trpcReact.sharedFileSystem.getShareNetworkById.useQuery(
    { project_id: projectId, shareNetworkId },
    { retry: false }
  )

  // Set breadcrumb before any early return: show the ID while loading/error, the name on success
  useSetBreadcrumb(routeId, shareNetwork ? getShareNetworkDisplayName(shareNetwork) : shareNetworkId)

  if (status === "pending") {
    return <Status status="progress" title={t`Loading Share Network Details...`} />
  }

  if (status === "error") {
    return <ShareNetworkLoadError error={error} onRetry={() => void refetch()} />
  }

  return (
    <>
      <ContentHeader title={getShareNetworkDisplayName(shareNetwork)} projectId={projectId} />
      <ShareNetworkDetailsView
        shareNetwork={shareNetwork}
        projectId={projectId}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </>
  )
}
