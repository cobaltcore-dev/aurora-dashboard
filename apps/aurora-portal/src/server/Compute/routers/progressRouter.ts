import { protectedProcedure } from "../../trpc"
import { observable } from "@trpc/server/observable"

let globalProgress = 0
let isProgressRunning = false
const progressSubscribers = new Set<(data: { progress: number }) => void>()

const clusterSubscribers = new Set<(data: { clusterId: string; status: string }) => void>()
let clusterInterval: NodeJS.Timeout | null = null

async function startProgressIfNeeded() {
  if (isProgressRunning) return

  isProgressRunning = true
  globalProgress = 0

  while (globalProgress < 100 && progressSubscribers.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    globalProgress += Math.random() * 15
    if (globalProgress > 100) globalProgress = 100

    const progressData = { progress: Math.round(globalProgress) }
    progressSubscribers.forEach((subscriber) => subscriber(progressData))
  }

  if (progressSubscribers.size > 0) {
    progressSubscribers.forEach((subscriber) => subscriber({ progress: 100 }))
  }

  isProgressRunning = false
}

async function startClusterMonitoringIfNeeded() {
  if (clusterInterval) return

  clusterInterval = setInterval(async () => {
    if (clusterSubscribers.size === 0) {
      if (clusterInterval) {
        clearInterval(clusterInterval)
        clusterInterval = null
      }
      return
    }

    try {
      // Here should normally be a fetch or your logic
      const state = Math.floor(Math.random() * 3)

      let status
      if (state === 0) {
        status = "Pending"
      } else if (state === 1) {
        status = "Running"
      } else {
        status = "Error"
      }
      const clusterData = { clusterId: "cluster", status }
      clusterSubscribers.forEach((subscriber) => subscriber(clusterData))
    } catch (error) {
      console.error("Error fetching state:", error)
      const errorData = { clusterId: "cluster", status: "Error" }
      clusterSubscribers.forEach((subscriber) => subscriber(errorData))
    }
  }, 1000)
}

export const progressRouter = {
  subscribe: protectedProcedure.subscription(() => {
    return observable<{ progress: number }>((emit) => {
      const subscriber = (data: { progress: number }) => {
        emit.next(data)
      }

      progressSubscribers.add(subscriber)
      startProgressIfNeeded()

      return () => {
        progressSubscribers.delete(subscriber)
      }
    })
  }),

  monitorCluster: protectedProcedure.subscription(() => {
    return observable<{ clusterId: string; status: string }>((emit) => {
      const subscriber = (data: { clusterId: string; status: string }) => {
        emit.next(data)
      }

      clusterSubscribers.add(subscriber)
      startClusterMonitoringIfNeeded()

      return () => {
        clusterSubscribers.delete(subscriber)
      }
    })
  }),
}
