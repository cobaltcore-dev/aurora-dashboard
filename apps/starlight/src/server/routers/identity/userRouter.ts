import { z } from "zod"
import { router, publicProcedure } from "../../../shared/trpc"
import type { User } from "../../../shared/types/models"

export const userRouter = {
  users: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): User => {
      return { id: input.id, name: "John Doe" }
    }),

    list: publicProcedure.query((): User[] => {
      return [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Doe" },
      ]
    }),
  }),
}
