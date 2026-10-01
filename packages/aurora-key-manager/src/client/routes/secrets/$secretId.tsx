import { createRoute, useNavigate } from "@tanstack/react-router"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { secretsRoute } from "./index"
import { SecretDetail } from "./SecretDetail"

export const secretDetailRoute = createRoute({
  getParentRoute: () => secretsRoute,
  path: "/$secretId",
  component: SecretDetailPage,
})

function SecretDetailPage() {
  const { projectId } = secretDetailRoute.useRouteContext()
  const { secretId } = secretDetailRoute.useParams()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Secrets", onClick: () => navigate({ to: "/secrets" }) },
    { label: secretId.slice(0, 8) + "…", active: true },
  ])

  return <SecretDetail projectId={projectId} secretId={secretId} onBack={() => navigate({ to: "/secrets" })} />
}
