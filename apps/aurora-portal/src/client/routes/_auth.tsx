import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"
import { InactivityModal } from "../components/Auth/InactivityModal"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const token = await context.trpcClient?.auth.getCurrentUserSession.query()
      if (!token) {
        // Speichere den vollständigen Pfad für Redirect
        throw redirect({
          to: "/auth/login",
          search: {
            redirect: location.pathname + location.search + location.hash,
          },
        })
      }
      context.auth?.login(token.user, token.expires_at)
    }
  },
})

function RouteComponent() {
  useAuth()

  return (
    <>
      <InactivityModal />
      <Outlet />
    </>
  )
}
