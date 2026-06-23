import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    // Always validate cookie first, even if client state says authenticated
    // This prevents race condition where cookie exists (e.g., from legacy dashboard)
    // but client state hasn't been initialized yet
    if (!context.auth?.isAuthenticated) {
      const token = await context.trpcClient?.auth.getCurrentUserSession.query()
      if (token) {
        // Update client state immediately when cookie is valid
        context.auth?.login(token.user, token.expires_at)
        return // Continue to route
      }
    }

    // Only redirect if still not authenticated after cookie validation
    if (!context.auth?.isAuthenticated) {
      const redirectPath = location.pathname ? location.pathname : ""

      throw redirect({
        to: "/",
        search: { redirect: redirectPath },
      })
    }
  },
})

function RouteComponent() {
  useAuth()

  return <Outlet />
}
