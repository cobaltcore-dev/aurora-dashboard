import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType")({
  staticData: { section: "services" },
  component: () => <Outlet />,
})
