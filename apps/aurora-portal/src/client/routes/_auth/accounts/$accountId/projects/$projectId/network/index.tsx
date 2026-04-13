import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/network/overview",
      params,
    })
  },
})
