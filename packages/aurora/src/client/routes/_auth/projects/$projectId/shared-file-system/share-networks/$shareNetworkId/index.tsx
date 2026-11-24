import { createFileRoute, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ShareNetworkDetail, ShareNetworkLoadError } from "./-components/ShareNetworkDetail"
import {
  DEFAULT_SHARE_NETWORK_DETAILS_TAB,
  isShareNetworkDetailsTab,
  type ShareNetworkDetailsTab,
} from "./-components/shareNetworkDetailUtils"

export interface ShareNetworkDetailsSearchParams {
  tab?: ShareNetworkDetailsTab
}

function ShareNetworkDetailErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return <ShareNetworkLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/share-networks/$shareNetworkId/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.share_networks.detail" },
  } satisfies RouteInfo,
  validateSearch: (search: Record<string, unknown>): ShareNetworkDetailsSearchParams => ({
    tab: isShareNetworkDetailsTab(search.tab) ? search.tab : undefined,
  }),
  head: () => ({ meta: [{ title: t`Share Network` }] }),
  component: ShareNetworkDetailRoute,
  errorComponent: ShareNetworkDetailErrorComponent,
})

function ShareNetworkDetailRoute() {
  const { projectId, shareNetworkId } = Route.useParams()
  const { tab = DEFAULT_SHARE_NETWORK_DETAILS_TAB } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleTabChange = (newTab: ShareNetworkDetailsTab) => {
    void navigate({
      search: (prev: ShareNetworkDetailsSearchParams) => ({
        ...prev,
        tab: newTab === DEFAULT_SHARE_NETWORK_DETAILS_TAB ? undefined : newTab,
      }),
      replace: true,
    })
  }

  return (
    <ShareNetworkDetail
      key={shareNetworkId}
      projectId={projectId}
      shareNetworkId={shareNetworkId}
      routeId={Route.id}
      activeTab={tab}
      onTabChange={handleTabChange}
    />
  )
}
