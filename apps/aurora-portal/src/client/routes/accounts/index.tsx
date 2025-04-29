import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/accounts/")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: "/auth/login" })
    }
  },
})

function RouteComponent() {
  return <div>Hello "/accounts/"!</div>
}
