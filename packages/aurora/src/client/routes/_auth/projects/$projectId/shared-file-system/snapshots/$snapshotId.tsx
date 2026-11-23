import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/snapshots/$snapshotId")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.snapshots.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share Snapshot` }] }),
  component: ShareSnapshotDetailScaffold,
})

function ShareSnapshotDetailScaffold() {
  const { t } = useLingui()
  const { snapshotId } = Route.useParams()
  useSetBreadcrumb(Route.id, snapshotId)
  return (
    <Status
      status="empty"
      title={t`Share Snapshot Details Coming Soon`}
      body={t`The shared file system scope is available. The share snapshot details will be added in a follow-up release.`}
    />
  )
}
