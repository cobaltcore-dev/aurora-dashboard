import { z } from "zod"
import { router, publicProcedure } from "../../../shared/trpc"

export const projectRouter = {
  projects: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => {
      return { id: input.id, name: "Project 1" }
    }),

    list: publicProcedure.query(() => {
      return [{ id: 1, name: "Project 2" }]
    }),
  }),
}
