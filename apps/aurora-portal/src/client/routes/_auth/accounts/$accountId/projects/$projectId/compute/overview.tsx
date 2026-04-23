import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/compute/overview"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/compute/overview",
      params: { projectId: params.projectId },
      replace: true,
    })
  },
})
