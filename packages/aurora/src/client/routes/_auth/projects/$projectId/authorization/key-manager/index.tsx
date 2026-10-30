import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/authorization/key-manager/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/authorization/key-manager/secrets",
      params: { projectId: params.projectId },
    })
  },
})
