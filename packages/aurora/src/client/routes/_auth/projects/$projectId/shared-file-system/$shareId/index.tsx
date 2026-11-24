import { createFileRoute, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ShareDetail, ShareLoadError } from "./-components/ShareDetail"
import { DEFAULT_SHARE_DETAILS_TAB, isShareDetailsTab, type ShareDetailsTab } from "./-components/shareDetailUtils"

export interface ShareDetailsSearchParams {
  tab?: ShareDetailsTab
}

function ShareDetailErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return <ShareLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/$shareId/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.shares.detail" },
  } satisfies RouteInfo,
  validateSearch: (search: Record<string, unknown>): ShareDetailsSearchParams => ({
    tab: isShareDetailsTab(search.tab) ? search.tab : undefined,
  }),
  head: () => ({ meta: [{ title: "Share Details" }] }),
  component: ShareDetailRoute,
  errorComponent: ShareDetailErrorComponent,
})

function ShareDetailRoute() {
  const { projectId, shareId } = Route.useParams()
  const { tab = DEFAULT_SHARE_DETAILS_TAB } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleTabChange = (newTab: ShareDetailsTab) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: newTab === DEFAULT_SHARE_DETAILS_TAB ? undefined : newTab,
      }),
      replace: true,
    })
  }

  return (
    <ShareDetail
      key={shareId}
      projectId={projectId}
      shareId={shareId}
      routeId={Route.id}
      activeTab={tab}
      onTabChange={handleTabChange}
    />
  )
}
