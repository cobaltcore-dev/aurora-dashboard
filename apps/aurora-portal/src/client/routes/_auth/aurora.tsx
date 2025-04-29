import { createFileRoute } from "@tanstack/react-router"

import { useAuth } from "../../store/AuthProvider"

export const Route = createFileRoute("/_auth/aurora")({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="grid gap-2 p-2">
      <p>Hi {user?.name}</p>
      <p>You are currently on the dashboard route.</p>
    </div>
  )
}
