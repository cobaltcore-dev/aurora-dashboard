import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import type { Project } from "../types/models"

export const projectRouter = {
  authProjects: protectedProcedure.query(async ({ ctx }): Promise<Project[]> => {
    const openstackSession = ctx.openstack

    const identityService = openstackSession?.service("identity")
    const data = await identityService?.get("projects").then((res) => res.json())
    return data.projects
  }),
  // temporary router for simple getProjectById should be replaced by rescope
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project> => {
      const openstackSession = ctx.openstack

      const identityService = openstackSession?.service("identity")
      const data = await identityService?.get("projects").then((res) => res.json())
      return data.projects.find((project: Project) => project.id === input.id)
    }),
}
