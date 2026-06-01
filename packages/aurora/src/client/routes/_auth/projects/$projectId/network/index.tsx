import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/network/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$projectId/network/overview",
      params,
    })
  },
})
