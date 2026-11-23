import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { msg, t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/share-networks/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    crumb: { text: msg`Share Networks` },
    analytics: { name: "shared-file-system.share_networks.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Share Networks` }] }),
  component: ShareNetworksScaffold,
})

function ShareNetworksScaffold() {
  const { t } = useLingui()
  return (
    <Status
      status="empty"
      title={t`Share Networks View Coming Soon`}
      body={t`The shared file system scope is available. The share networks list will be added in a follow-up release.`}
    />
  )
}
