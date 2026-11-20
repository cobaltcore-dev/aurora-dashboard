import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { VolumeDetails } from "./-components/VolumeDetails"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/$volumeId/")({
  staticData: {
    section: "block-storage",
    service: "volumes",
    analytics: { name: "volume.volumes.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Volume Details` }] }),
  component: () => <VolumeDetails {...Route.useParams()} />,
})
