import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/accounts/$accountId/")({
  beforeLoad: () => {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: undefined!,
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>test</div>
}
