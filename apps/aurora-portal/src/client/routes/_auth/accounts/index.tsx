import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/")({
  component: RouteComponent,

  beforeLoad: ({ context }) => {
    if (context.auth?.isAuthenticated && context.auth.user?.domain?.id) {
      throw redirect({
        to: `/accounts/$accountId/projects`,
        params: {
          accountId: context.auth.user?.domain?.id,
        },
      })
    } else {
      throw redirect({ to: "/auth/login" })
    }
  },
})

function RouteComponent() {
  return <div>Hello "/accounts/"!</div>
}
