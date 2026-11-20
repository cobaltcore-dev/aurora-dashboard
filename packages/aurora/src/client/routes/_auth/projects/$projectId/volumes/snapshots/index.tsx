import { createFileRoute } from "@tanstack/react-router"
import { msg, t } from "@lingui/core/macro"
import { ResourceList } from "../-components/ResourceList"
import { volumeSearchSchema } from "../-utils/list"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/snapshots/")({
  staticData: {
    section: "block-storage",
    service: "volumes",
    crumb: { text: msg`Snapshots` },
    analytics: { name: "volume.snapshots.list" },
  } satisfies RouteInfo,
  validateSearch: (search) =>
    volumeSearchSchema.pick({ search: true, sortBy: true, sortDirection: true, status: true }).parse(search),
  head: () => ({ meta: [{ title: t`Snapshots` }] }),
  component: () => <ResourceList projectId={Route.useParams().projectId} snapshots />,
})
