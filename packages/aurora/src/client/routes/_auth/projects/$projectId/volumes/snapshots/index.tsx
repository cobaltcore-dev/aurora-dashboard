import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { msg, t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/volumes/snapshots/")({
  staticData: {
    section: "block-storage",
    service: "volumes",
    crumb: { text: msg`Snapshots` },
    analytics: { name: "volume.snapshots.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Snapshots` }] }),
  component: SnapshotsScaffold,
})

function SnapshotsScaffold() {
  const { t } = useLingui()
  return (
    <Status
      status="empty"
      title={t`Snapshots View Coming Soon`}
      body={t`The block storage scope is available. The snapshots list will be added in a follow-up release.`}
    />
  )
}
