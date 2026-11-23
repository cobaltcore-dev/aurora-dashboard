import { createFileRoute } from "@tanstack/react-router"
import { Status } from "@cloudoperators/juno-ui-components"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute(
  "/_auth/projects/$projectId/shared-file-system/security-services/$securityServiceId"
)({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.security_services.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Security Service` }] }),
  component: SecurityServiceDetailScaffold,
})

function SecurityServiceDetailScaffold() {
  const { t } = useLingui()
  const { securityServiceId } = Route.useParams()
  useSetBreadcrumb(Route.id, securityServiceId)
  return (
    <Status
      status="empty"
      title={t`Security Service Details Coming Soon`}
      body={t`The shared file system scope is available. The security service details will be added in a follow-up release.`}
    />
  )
}
