import { z } from "zod"
import { router, publicProcedure } from "../../../shared/trpc"
import type { Project } from "../../../shared/types/models"

export const projectRouter = {
  projects: router({
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): Project => {
      return { id: input.id, title: "Project 1" }
    }),

    list: publicProcedure.query((): Project[] => {
      return [
        { id: 1, title: "Project 2" },
        { id: 2, title: "Project 2" },
      ]
    }),
  }),
}
