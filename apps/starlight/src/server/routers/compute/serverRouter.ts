import { z } from "zod"
import { router, publicProcedure } from "../../../shared/trpc"

export const serverRouter = {
  servers: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => {
      return { id: input.id, name: "John Doe" }
    }),

    list: publicProcedure.query(() => {
      return [{ id: 1, name: "John Doe" }]
    }),
  }),
}
