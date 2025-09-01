import { protectedProcedure } from "../../trpc"
import { z } from "zod"
import { createFlavor, fetchFlavors, filterAndSortFlavors, deleteFlavor } from "../helpers/flavorHelpers"
import { Flavor } from "../types/flavor"
import { TRPCError } from "@trpc/server"
import { ERROR_CODES } from "../../errorCodes"

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
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
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
          message: ERROR_CODES.FLAVORS_FETCH_FAILED,
          cause: error,
        })
      }
    }),
  createFlavor: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavor: z.object({
          id: z.string().optional(),
          name: z.string(),
          vcpus: z.number(),
          ram: z.number(),
          disk: z.number(),
          swap: z.number().optional(),
          rxtx_factor: z.number().optional(),
          "OS-FLV-EXT-DATA:ephemeral": z.number().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavor } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const flavorData = {
          ...flavor,
          "OS-FLV-EXT-DATA:ephemeral": flavor["OS-FLV-EXT-DATA:ephemeral"] || 0,
        }

        const result = await createFlavor(compute, flavorData)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.CREATE_FLAVOR_FAILED,
          cause: error,
        })
      }
    }),
  deleteFlavor: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavorId } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        await deleteFlavor(compute, flavorId)

        return { success: true, message: "Flavor deleted successfully" }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.DELETE_FLAVOR_FAILED,
          cause: error,
        })
      }
    }),
}
