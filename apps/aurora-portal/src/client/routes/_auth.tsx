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
      console.log("Restoring session with token:", token.expires_at)
      context.auth?.login(token.user, "2025-04-29T15:46:18.000000Z")
    }
  },
})

function RouteComponent() {
  const { user } = useAuth()

  console.log("Auth Data:", user)

  return <Outlet /> // This is where child routes will render
}
