import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/$shareId/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.shares.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share` }] }),
  component: ShareDetailScaffold,
})

function ShareDetailScaffold() {
  const { t } = useLingui()
  const { shareId } = Route.useParams()
  useSetBreadcrumb(Route.id, shareId)
  return (
    <Status
      status="empty"
      title={t`Share Details Coming Soon`}
      body={t`The shared file system scope is available. The share details will be added in a follow-up release.`}
    />
  )
}
