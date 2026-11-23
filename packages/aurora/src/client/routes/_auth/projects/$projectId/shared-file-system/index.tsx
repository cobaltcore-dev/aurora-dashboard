import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.shares.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Shares` }] }),
  component: SharesScaffold,
})

function SharesScaffold() {
  const { t } = useLingui()
  return (
    <Status
      status="empty"
      title={t`Shares View Coming Soon`}
      body={t`The shared file system scope is available. The shares list will be added in a follow-up release.`}
    />
  )
}
