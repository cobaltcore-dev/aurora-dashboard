import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"
import { SecretDetailsView } from "./-components/SecretDetailsView"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/secrets/$secretId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
  } satisfies RouteInfo,
  component: SecretDetailPage,
})

function SecretDetailPage() {
  const { projectId, secretId } = Route.useParams() as { projectId: string; secretId: string }
  const navigate = useNavigate()

  const { data: secret } = trpcReact.keyManager.getSecret.useQuery({ project_id: projectId, secretId })
  useSetBreadcrumb(Route.id, secret?.name ?? secretId)

  return (
    <SecretDetailsView
      projectId={projectId}
      secretId={secretId}
      onBack={() => {
        void navigate({
          to: "/projects/$projectId/authorization/key-manager/secrets",
          params: { projectId },
        })
      }}
    />
  )
}
