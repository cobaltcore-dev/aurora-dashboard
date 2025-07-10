import { useState, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { trpcClient } from "../../trpcClient"
import { useAuth } from "../../store/AuthProvider"

export const Route = createFileRoute("/_auth/aurora")({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Subscribe to progress updates
    const subscription = trpcClient.subscribe.subscribe(undefined, {
      onData: (data) => {
        setProgress(data.progress)
      },
      onError: (error) => {
        console.error("Progress subscription error:", error)
      },
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="grid gap-2 p-2">
      <p>Hi {user?.name}</p>
      <p>You are currently on the dashboard route.</p>
      <p>Progress: {progress}%</p>
    </div>
  )
}
