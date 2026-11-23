import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/share-networks/$shareNetworkId/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.share_networks.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share Network` }] }),
  component: ShareNetworkDetailScaffold,
})

function ShareNetworkDetailScaffold() {
  const { t } = useLingui()
  const { shareNetworkId } = Route.useParams()
  useSetBreadcrumb(Route.id, shareNetworkId)
  return (
    <Status
      status="empty"
      title={t`Share Network Details Coming Soon`}
      body={t`The shared file system scope is available. The share network details will be added in a follow-up release.`}
    />
  )
}
