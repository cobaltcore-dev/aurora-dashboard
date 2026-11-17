import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/")({
  staticData: {
    section: "block-storage",
    service: "volumes",
    analytics: { name: "volume.volumes.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Volumes` }] }),
  component: VolumesScaffold,
})

function VolumesScaffold() {
  const { t } = useLingui()
  return (
    <Status
      status="empty"
      title={t`Volumes View Coming Soon`}
      body={t`The block storage scope is available. The volumes list will be added in a follow-up release.`}
    />
  )
}
