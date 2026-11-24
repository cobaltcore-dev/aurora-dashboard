import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { SecurityServiceDetail, SecurityServiceLoadError } from "./-components/SecurityServiceDetail"

function SecurityServiceDetailErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    void router.invalidate()
  }

  return <SecurityServiceLoadError error={error} onRetry={handleRetry} />
}

export const Route = createFileRoute(
  "/_auth/projects/$projectId/shared-file-system/security-services/$securityServiceId"
)({
  staticData: {
    section: "storage",
    service: "shared-file-system",
    analytics: { name: "shared-file-system.security_services.detail" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Security Service` }] }),
  component: SecurityServiceDetailRoute,
  errorComponent: SecurityServiceDetailErrorComponent,
})

function SecurityServiceDetailRoute() {
  const { projectId, securityServiceId } = Route.useParams()
  return (
    <SecurityServiceDetail
      key={securityServiceId}
      projectId={projectId}
      securityServiceId={securityServiceId}
      routeId={Route.id}
    />
  )
}
