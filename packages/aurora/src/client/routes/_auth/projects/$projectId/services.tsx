import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/services")({
  component: () => <Outlet />,
})

export { Route as servicesRoute }
