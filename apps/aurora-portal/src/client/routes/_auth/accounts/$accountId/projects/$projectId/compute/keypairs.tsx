import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/compute/keypairs"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/\$projectId/compute/keypairs",
      params: { projectId: params.projectId },
      replace: true,
    })
  },
})
