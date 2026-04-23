import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/compute/servergroups"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/\$projectId/compute/servergroups",
      params: { projectId: params.projectId },
      replace: true,
    })
  },
})
