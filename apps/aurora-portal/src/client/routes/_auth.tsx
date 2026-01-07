import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const token = await context.trpcClient?.auth.getCurrentUserSession.query()
      if (!token) {
        const redirectPath = location.pathname + location.search

        throw redirect({
          to: "/auth/login",
          search: {
            redirect: redirectPath,
          },
        })
      }
      context.auth?.login(token.user, token.expires_at)
    }
  },
})

function RouteComponent() {
  useAuth()

  // ✅ Modal wurde entfernt - ist jetzt in App.tsx
  return <Outlet />
}
