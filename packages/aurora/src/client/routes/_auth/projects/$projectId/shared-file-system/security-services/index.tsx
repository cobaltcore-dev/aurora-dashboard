import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { msg, t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/shared-file-system/security-services/")({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    crumb: { text: msg`Security Services` },
    analytics: { name: "shared-file-system.security_services.list" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Security Services` }] }),
  component: SecurityServicesScaffold,
})

function SecurityServicesScaffold() {
  const { t } = useLingui()
  return (
    <Status
      status="empty"
      title={t`Security Services View Coming Soon`}
      body={t`The shared file system scope is available. The security services list will be added in a follow-up release.`}
    />
  )
}
