import { protectedProcedure } from "../../trpc"
import { flavorResponseSchema, Flavor } from "../types/flavor"
import { z } from "zod"

export const flavorRouter = {
  getFlavorsByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<Flavor[] | undefined> => {
      try {
        const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
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

        return parsedData.data.flavors
      } catch (error) {
        console.error("Error fetching flavors:", error)
        return undefined
      }
    }),
}
