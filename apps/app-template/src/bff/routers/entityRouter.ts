import { router, publicProcedure } from "./trpc"
import { z } from "zod"

export const entityRouter = {
  entities: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => {
      return { id: input.id, name: "Mars 1" }
    }),

    list: publicProcedure.query(async () => {
      return [
        { id: 1, name: "Mars 1" },
        { id: 2, name: "Mars 2" },
        { id: 3, name: "Mars 3" },
        { id: 4, name: "Mars 4" },
        { id: 5, name: "Mars 5" },
      ]
    }),
  }),
}
