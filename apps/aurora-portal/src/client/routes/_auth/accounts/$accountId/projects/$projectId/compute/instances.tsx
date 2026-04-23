import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/compute/instances"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/\$projectId/compute/instances",
      params: { projectId: params.projectId },
      replace: true,
    })
  },
})
