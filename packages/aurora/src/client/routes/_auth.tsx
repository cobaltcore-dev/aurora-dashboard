import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const searchString = new URLSearchParams(location.search).toString()
      const redirectPath = location.pathname + (searchString ? `?${searchString}` : "")

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
