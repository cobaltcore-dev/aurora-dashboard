import { protectedProcedure } from "../../trpc"
import { z } from "zod"
import {
  createFlavor,
  fetchFlavors,
  filterAndSortFlavors,
  deleteFlavor,
  createExtraSpecs,
  getExtraSpecs,
  deleteExtraSpec,
  getFlavorAccess,
  addTenantAccess,
  removeTenantAccess,
  getFlavorById,
} from "../helpers/flavorHelpers"
import { Flavor } from "../types/flavor"
import { TRPCError } from "@trpc/server"
import { ERROR_CODES } from "../../errorCodes"

export const flavorRouter = {
  getFlavorById: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
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

        const flavor = await getFlavorById(compute, flavorId)
        return flavor
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.GET_FLAVOR_DETAILS_FAILED,
          cause: error,
        })
      }
    }),
  getFlavorsByProjectId: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sortBy: z.string().optional().default("name"),
        sortDirection: z.string().optional().default("asc"),
        searchTerm: z.string().optional().default(""),
        isPublic: z.string().optional().default("None"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { projectId, sortBy, sortDirection, searchTerm, isPublic } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }
        const flavors = await fetchFlavors(compute, isPublic)

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
          "os-flavor-access:is_public": z.boolean().optional(),
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
  createExtraSpecs: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
        extra_specs: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavorId, extra_specs } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const result = await createExtraSpecs(compute, flavorId, extra_specs)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
          cause: error,
        })
      }
    }),
  getExtraSpecs: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
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

        const result = await getExtraSpecs(compute, flavorId)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
          cause: error,
        })
      }
    }),

  deleteExtraSpec: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
        key: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavorId, key } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        await deleteExtraSpec(compute, flavorId, key)
        return { success: true, message: "Extra spec deleted successfully" }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
          cause: error,
        })
      }
    }),
  getFlavorAccess: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
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

        // First, get the flavor details to check if it's public
        const flavorResponse = await compute.get(`flavors/${flavorId}`)
        if (!flavorResponse.ok) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ERROR_CODES.GET_FLAVOR_ACCESS_NOT_FOUND,
          })
        }

        const flavorData = await flavorResponse.json()
        const isPublic = flavorData.flavor["os-flavor-access:is_public"]

        // If flavor is public, return empty array since public flavors don't have access restrictions
        if (isPublic !== false) {
          return []
        }

        // Only call the access API for private flavors
        const result = await getFlavorAccess(compute, flavorId)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.GET_FLAVOR_ACCESS_FAILED,
          cause: error,
        })
      }
    }),
  addTenantAccess: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavorId, tenantId } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const result = await addTenantAccess(compute, flavorId, tenantId)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.ADD_TENANT_ACCESS_FAILED,
          cause: error,
        })
      }
    }),

  removeTenantAccess: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        flavorId: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { projectId, flavorId, tenantId } = input

        const openstackSession = await ctx.rescopeSession({ projectId })
        const compute = openstackSession?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const result = await removeTenantAccess(compute, flavorId, tenantId)
        return result
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.REMOVE_TENANT_ACCESS_FAILED,
          cause: error,
        })
      }
    }),
}
