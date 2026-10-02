import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import { SecretDetail } from "./-components/SecretDetail"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/secrets/$secretId")({
  staticData: {
    section: "authorization",
    service: "key-manager",
    crumb: { text: msg`Secret Detail` },
  } satisfies RouteInfo,
  component: SecretDetailPage,
})

function SecretDetailPage() {
  const { projectId, secretId } = Route.useParams() as { projectId: string; secretId: string }
  const navigate = useNavigate()

  return (
    <SecretDetail
      projectId={projectId}
      secretId={secretId}
      onBack={() => {
        void navigate({
          to: "/projects/$projectId/authorization/key-manager/secrets/",
          params: { projectId },
        })
      }}
    />
  )
}
