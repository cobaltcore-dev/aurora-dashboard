import { protectedProcedure } from "../../trpc"
import { flavorResponseSchema, Flavor } from "../types/flavor"
import { z } from "zod"

export const flavorRouter = {
  getFlavorsByProjectId: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sortBy: z.string().optional().default("name"),
        sortDirection: z.string().optional().default("asc"),
      })
    )
    .query(async ({ input, ctx }): Promise<Flavor[] | undefined> => {
      try {
        const { projectId, sortBy, sortDirection } = input

        const openstackSession = await ctx.rescopeSession({ projectId: projectId })
        const compute = openstackSession?.service("compute")

        if (!compute) {
          console.error("Compute service not available")
          return undefined
        }

        const response = await compute.get("/compute/v2.1/flavors/detail")
        const rawData = await response.text()

        const jsonData = JSON.parse(rawData)
        const parsedData = flavorResponseSchema.safeParse(jsonData)

        if (!parsedData.success) {
          console.error("Zod Parsing Error:")
          console.error(JSON.stringify(parsedData.error.format(), null, 2))

          parsedData.error.errors.forEach((err) => {
            console.error(`Error at path ${err.path.join(".")}: ${err.message}`)
            const pathValue = err.path.reduce((obj, key) => obj && obj[key], jsonData)
            console.error(`Actual value at path:`, pathValue)
          })

          return undefined
        }

        const flavors = parsedData.data.flavors

        flavors.sort((a, b) => {
          const key = sortBy as keyof Flavor
          const aValue = a[key]
          const bValue = b[key]

          if (aValue == null && bValue == null) return 0
          if (aValue == null) return sortDirection === "asc" ? 1 : -1
          if (bValue == null) return sortDirection === "asc" ? -1 : 1

          if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
          if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
          return 0
        })

        return flavors
      } catch (error) {
        console.error("Error fetching flavors:", error)
        return undefined
      }
    }),
}
