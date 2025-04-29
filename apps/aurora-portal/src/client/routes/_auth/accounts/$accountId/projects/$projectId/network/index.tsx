import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/network/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/accounts/$accountId/projects_/$projectId/network/"!</div>
}
