import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ShareSnapshotDetail, ShareSnapshotLoadError } from "./-components/ShareSnapshotDetail"

function ShareSnapshotDetailErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return <ShareSnapshotLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/snapshots/$snapshotId")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.snapshots.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share Snapshot` }] }),
  component: ShareSnapshotDetailRoute,
  errorComponent: ShareSnapshotDetailErrorComponent,
})

function ShareSnapshotDetailRoute() {
  const { projectId, snapshotId } = Route.useParams()
  return <ShareSnapshotDetail key={snapshotId} projectId={projectId} snapshotId={snapshotId} routeId={Route.id} />
}
