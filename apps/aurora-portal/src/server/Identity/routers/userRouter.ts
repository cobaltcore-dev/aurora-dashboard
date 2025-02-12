import { z } from "zod"
import { publicProcedure } from "../../trpc"
import type { User } from "../../../shared/types/models"

export const userRouter = {
  getUser: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): User => {
    return { id: input.id, name: "John Doe" }
  }),

  getUsers: publicProcedure.query((): User[] => {
    return [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Doe" },
    ]
  }),
}
