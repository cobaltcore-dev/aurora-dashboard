import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { Project, projectsResponseSchema } from "../types/models"

export const projectRouter = {
  authProjects: protectedProcedure.query(async ({ ctx }): Promise<Project[] | undefined> => {
    const openstackSession = ctx.openstack

    const identityService = openstackSession?.service("identity")
    const parsedData = projectsResponseSchema.safeParse(
      await identityService?.get("projects").then((res) => res.json())
    )
    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }
    return parsedData.data.projects
  }),
  // temporary router for simple getProjectById should be replaced by rescope
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      const openstackSession = ctx.openstack

      const identityService = openstackSession?.service("identity")
      const parsedData = projectsResponseSchema.safeParse(
        await identityService?.get("projects").then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.projects.find((project: Project) => project.id === input.id)
    }),
}
