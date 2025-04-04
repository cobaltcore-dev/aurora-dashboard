import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import { Server, serverResponseSchema } from "../types/server"

export const serverRouter = {
  getServersByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }): Promise<Server[] | undefined> => {
      try {
        const openstackSession = await ctx.rescopeSession({ projectId: input.projectId })
        const compute = openstackSession?.service("compute")

        if (!compute) {
          console.error("Compute service not available")
          return undefined
        }

        // Get the raw response first
        const response = await compute.get("servers/detail")
        const rawData = await response.json()

        // Try parsing with Zod
        const parsedData = serverResponseSchema.safeParse(rawData)

        if (!parsedData.success) {
          // Enhanced error logging
          console.error("Zod Parsing Error:")
          console.error(JSON.stringify(parsedData.error.format(), null, 2))

          // Log the specific error path that caused the issue
          parsedData.error.errors.forEach((err) => {
            console.error(`Error at path ${err.path.join(".")}: ${err.message}`)
            // Show the actual data at this path for comparison
            const pathValue = err.path.reduce((obj, key) => obj && obj[key], rawData)
            console.error(`Actual value at path:`, pathValue)
          })

          return undefined
        }

        return parsedData.data.servers
      } catch (error) {
        console.error("Error fetching servers:", error)
        return undefined
      }
    }),
}
