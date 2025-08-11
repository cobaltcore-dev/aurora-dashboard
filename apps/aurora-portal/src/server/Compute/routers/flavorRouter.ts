import { protectedProcedure } from "../../trpc"
import { z } from "zod"
import { getComputeService, fetchFlavors, filterAndSortFlavors } from "../helpers/flavorHelpers"
import { Flavor } from "../types/flavor"

export const flavorRouter = {
  getFlavorsByProjectId: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sortBy: z.string().optional().default("name"),
        sortDirection: z.string().optional().default("asc"),
        searchTerm: z.string().optional().default(""),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { projectId, sortBy, sortDirection, searchTerm } = input
        const compute = await getComputeService(ctx, projectId)
        const flavors = await fetchFlavors(compute)

        return filterAndSortFlavors(flavors, searchTerm, sortBy as keyof Flavor, sortDirection)
      } catch (error) {
        console.error("Error fetching flavors:", error)
        throw new Error("Failed to fetch flavors")
      }
    }),
}
