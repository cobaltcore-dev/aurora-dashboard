import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { SnapshotDetails } from "../-components/SnapshotDetails"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/snapshots/$snapshotId")({
  staticData: {
    section: "storage",
    service: "volumes",
    analytics: { name: "volume.snapshots.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Snapshot Details` }] }),
  component: () => <SnapshotDetails {...Route.useParams()} />,
})
