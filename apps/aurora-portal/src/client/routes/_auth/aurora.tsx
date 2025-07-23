import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "../../store/AuthProvider"
import { trpcClient } from "@/client/trpcClient"
import { useSSEUpdates } from "@/client/hooks/useSSEUpdates"
import { useAutoRefetch } from "@/client/hooks/useAutoRefetch"

export const Route = createFileRoute("/_auth/aurora")({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  useSSEUpdates()

  useAutoRefetch("progress")

  const progressQuery = trpcClient.get.query()

  return (
    <div className="grid gap-2 p-2">
      <p>Hi {user?.name}</p>
      <p>You are currently on the dashboard route.</p>
      <p>Progress: {progressQuery.data ?? 0}%</p>
    </div>
  )
}
