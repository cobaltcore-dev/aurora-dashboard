import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { Project, projectsResponseSchema } from "../types/models"

export const projectRouter = {
  getAuthProjects: protectedProcedure.query(async ({ ctx }): Promise<Project[] | undefined> => {
    const token = ctx.openstack?.getToken()
    const domainId = token?.tokenData?.project?.domain?.id || token?.tokenData?.user?.domain?.id
    const openstackSession = await ctx.rescopeSession({ domainId: domainId })

    const identityService = openstackSession?.service("identity")
    const parsedData = projectsResponseSchema.safeParse(
      await identityService?.get("auth/projects").then((res) => res.json())
    )
    if (!parsedData.success) {
      console.error("Zod Parsing Error:", parsedData.error.format())
      return undefined
    }
    return parsedData.data.projects
  }),

  searchProjects: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<Project[] | undefined> => {
      const identityService = ctx.openstack?.service("identity")

      const parsedData = projectsResponseSchema.safeParse(
        await identityService?.get("auth/projects").then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }

      let projects = parsedData.data.projects

      if (input.search && input.search.trim() !== "") {
        const searchTermLower = input.search.toLowerCase()
        projects = projects.filter(
          (project) =>
            project.name.toLowerCase().includes(searchTermLower) ||
            (project.description && project.description.toLowerCase().includes(searchTermLower))
        )
      }

      projects.sort((a, b) => a.name.localeCompare(b.name))

      return projects
    }),

  // temporary router for simple getProjectById should be replaced by rescope
  getProjectById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<Project | undefined> => {
      const openstackSession = ctx.openstack

      const identityService = openstackSession?.service("identity")
      const parsedData = projectsResponseSchema.safeParse(
        await identityService?.get(`projects/${input.id}`).then((res) => res.json())
      )
      if (!parsedData.success) {
        console.error("Zod Parsing Error:", parsedData.error.format())
        return undefined
      }
      return parsedData.data.projects.find((project: Project) => project.id === input.id)
    }),
}
