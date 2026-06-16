import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/services/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/projects/$projectId", params })
  },
})
