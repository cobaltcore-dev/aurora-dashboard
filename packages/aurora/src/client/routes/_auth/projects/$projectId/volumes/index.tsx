import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { ResourceList } from "./-components/ResourceList"
import { volumeSearchSchema } from "./-utils/list"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/")({
  staticData: {
    section: "storage",
    service: "volumes",
    analytics: { name: "volume.volumes.list" },
  } satisfies RouteInfo,
  validateSearch: (search) => volumeSearchSchema.parse(search),
  head: () => ({ meta: [{ title: t`Volumes` }] }),
  component: () => <ResourceList projectId={Route.useParams().projectId} />,
})
