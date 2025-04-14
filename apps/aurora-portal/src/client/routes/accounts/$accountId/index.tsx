import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/accounts/$accountId/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/accounts/$accountId/"!</div>
}
