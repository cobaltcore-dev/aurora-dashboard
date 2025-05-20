import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

export const Route = createFileRoute("/_auth/accounts/")({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),

  beforeLoad: ({ context, search }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: search.redirect || `/accounts/${context.auth.user?.domain.id}/projects` })
    } else {
      throw redirect({ to: "/auth/login" })
    }
  },
})

function RouteComponent() {
  return <div>Hello "/accounts/"!</div>
}
