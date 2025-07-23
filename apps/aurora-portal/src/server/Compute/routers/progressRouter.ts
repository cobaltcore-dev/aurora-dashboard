import { protectedProcedure } from "../../trpc"
import { updateService } from "@/server/SSE/UpdateService"

let progressCache = 0

export const progressRouter = {
  get: protectedProcedure.query(async (): Promise<number> => {
    try {
      const response = await fetch("http://localhost:3000/state")
      const data = await response.json()
      progressCache = data.state
      return progressCache
    } catch (error) {
      console.error("Failed to fetch progress:", error)
      return progressCache
    }
  }),

  refresh: protectedProcedure.mutation(async () => {
    updateService.notify("progress")
    return { success: true }
  }),
}
