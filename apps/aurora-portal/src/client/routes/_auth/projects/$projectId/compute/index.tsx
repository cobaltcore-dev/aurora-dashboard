import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/compute/overview",
      params,
    })
  },
})
