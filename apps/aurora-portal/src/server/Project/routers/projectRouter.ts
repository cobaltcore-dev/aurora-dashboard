import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { Project, projectsResponseSchema } from "../types/models"

export const projectRouter = {
  authProjects: protectedProcedure.query(async ({ ctx }): Promise<Project[] | undefined> => {
    const openstackSession = ctx.openstack

    const identityService = openstackSession?.service("identity")
    const data = await identityService?.get("projects").then((res) => projectsResponseSchema.parse(res.json()))
    const projects = data?.projects
    return projects
  }),
  // temporary router for simple getProjectById should be replaced by rescope
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      const openstackSession = ctx.openstack

      const identityService = openstackSession?.service("identity")
      const data = await identityService?.get("projects").then((res) => projectsResponseSchema.parse(res.json()))
      const project = data?.projects.find((project) => project.id === input.id)
      return project
    }),
}
