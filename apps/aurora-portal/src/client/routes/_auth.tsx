import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const token = await context.trpcClient?.auth.getCurrentUserSession.query()
      if (!token) {
        throw redirect({
          to: "/auth/login",
          search: {
            redirect: location.href,
          },
        })
      }
      context.auth?.login(token.user, token.expires_at)
    }
  },
})

function RouteComponent() {
  useAuth()

  return <Outlet /> // This is where child routes will render
}
