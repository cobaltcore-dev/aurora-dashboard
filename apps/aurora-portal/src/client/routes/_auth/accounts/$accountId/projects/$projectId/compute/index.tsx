import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/compute/overview",
      params,
    })
  },
})
