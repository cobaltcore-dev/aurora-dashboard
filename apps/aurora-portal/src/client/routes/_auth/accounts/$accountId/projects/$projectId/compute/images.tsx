import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/compute/images"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/compute/images",
      params: { projectId: params.projectId },
      replace: true,
    })
  },
})
