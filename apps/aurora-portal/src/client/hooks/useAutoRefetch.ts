import { useEffect } from "react"
import { trpcClient } from "../trpcClient"
import { UpdateType } from "@/server/SSE/UpdateService"

export function useAutoRefetch(updateType: UpdateType) {
  const utils = trpcClient.useUtils()

  useEffect(() => {
    const handleUpdate = () => {
      console.log(`Invalidating ${updateType} data`)
      switch (updateType) {
        case "progress":
          utils.progress.get.invalidate()
          break
        default:
          console.log(`Unknown update type: ${updateType}`)
      }
    }

    window.addEventListener(`update-${updateType}`, handleUpdate)
    return () => window.removeEventListener(`update-${updateType}`, handleUpdate)
  }, [updateType, utils])
}
