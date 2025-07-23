import { trpcClient } from "../trpcClient"
import { UpdateType } from "@/server/SSE/UpdateService"

export function useSSEUpdates() {
  trpcClient.sse.subscribe.subscribe(undefined, {
    onData: (updateType: UpdateType) => {
      console.log("SSE Update:", updateType)
      window.dispatchEvent(new CustomEvent(`update-${updateType}`))
    },
    onError: (error) => {
      console.error("SSE Error:", error)
    },
  })
}
