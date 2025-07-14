import { useState, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { trpcClient } from "../../trpcClient"
import { useAuth } from "../../store/AuthProvider"
import { z } from "zod"

const ClusterDataSchema = z.object({
  clusterId: z.string(),
  status: z.union([z.literal("Pending"), z.literal("Running"), z.literal("Error")]),
})

const ProgressDataSchema = z.object({
  progress: z.number().min(0).max(100),
})

export const Route = createFileRoute("/_auth/aurora")({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  const [progress, setProgress] = useState(0)
  const [clusterData, setData] = useState<{ clusterId: string; status: "Pending" | "Running" | "Error" } | null>(null)

  useEffect(() => {
    // Subscribe to cluster status updates
    const subscription = trpcClient.monitorCluster.subscribe(undefined, {
      onData: (data) => {
        const result = ClusterDataSchema.safeParse(data)
        if (result.success) {
          setData(result.data)
        } else {
          console.error("Invalid cluster data received:", result.error)
        }
      },
      onError: (error) => {
        console.error("Cluster subscription error:", error)
      },
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const subscription = trpcClient.subscribe.subscribe(undefined, {
      onData: (data) => {
        const result = ProgressDataSchema.safeParse(data)
        if (result.success) {
          setProgress(result.data.progress)
        } else {
          console.error("Invalid cluster data received:", result.error)
        }
      },
      onError: (error) => {
        console.error("Progress subscription error:", error)
      },

      onComplete: () => {
        console.log("Progress subscription completed")
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
      <p>{clusterData ? <>Cluster is {clusterData.status}</> : "Connecting..."}</p>
    </div>
  )
}
