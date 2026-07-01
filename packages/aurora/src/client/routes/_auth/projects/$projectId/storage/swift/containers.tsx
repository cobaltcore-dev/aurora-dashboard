import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/swift/containers")({
  component: () => <Outlet />,
})
