import { protectedProcedure } from "../../trpc"
import { z } from "zod"
import { fetchFlavors, filterAndSortFlavors } from "../helpers/flavorHelpers"
import { Flavor } from "../types/flavor"
import { TRPCError } from "@trpc/server"

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

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to the compute service for this project.",
          })
        }
        const flavors = await fetchFlavors(compute)

        return filterAndSortFlavors(flavors, searchTerm, sortBy as keyof Flavor, sortDirection)
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch flavors",
          cause: error,
        })
      }
    }),
}
