import { protectedProcedure } from "../trpc"
import { observable } from "@trpc/server/observable"
import { updateService, UpdateType } from "./UpdateService"

export const sseRouter = {
  subscribe: protectedProcedure.subscription(() => {
    return observable<UpdateType>((emit) => {
      emit.next("progress")

      const unsubscribe = updateService.subscribe((type) => {
        emit.next(type)
      })

      return unsubscribe
    })
  }),
}
