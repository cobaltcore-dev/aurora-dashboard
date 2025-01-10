import { z } from "zod"
import { publicProcedure } from "../../trpc"
import type { Project } from "../../../shared/types/models"

export const projectRouter = {
  getProject: publicProcedure.input(z.object({ id: z.number() })).query(({ input }): Project => {
    return { id: input.id, title: "Project 1" }
  }),

  getProjects: publicProcedure.query((): Project[] => {
    return [
      { id: 1, title: "Project 2" },
      { id: 2, title: "Project 2" },
    ]
  }),
}
