import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"
import { DynamicBreadcrumbProvider } from "@/client/context/DynamicBreadcrumbContext"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth")({
  staticData: {
    crumb: { text: "Home", icon: "home", to: "/projects" },
  } satisfies RouteInfo,
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const redirectPath = `${location.pathname}${location.searchStr || ""}${location.hash || ""}`

      throw redirect({
        to: "/",
        search: { redirect: redirectPath },
      })
    }
  },
})

function RouteComponent() {
  useAuth()

  return (
    <DynamicBreadcrumbProvider>
      <Outlet />
    </DynamicBreadcrumbProvider>
  )
}
