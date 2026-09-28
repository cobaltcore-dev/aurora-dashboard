import { projectScopedProcedure } from "../../trpc"
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
  supportsDescriptionField,
} from "../helpers/flavorHelpers"
import { Flavor, CreateFlavorInput } from "../types/flavor"
import { TRPCError } from "@trpc/server"
import { ERROR_CODES } from "../../errorCodes"
import { validateAndEncodeResourceId, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"

export const flavorRouter = {
  getComputeApiVersion: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
      })
    )
    .query(async ({ ctx }) => {
      try {
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        // Query the version discovery endpoint to get the max microversion
        const response = await compute.get("")
        const data = await response.json()

        // The response can be either { version: {...} } or { versions: [...] }
        let versionString = "2.1"
        if (data.version) {
          // Single version object (when already at /v2.1/)
          versionString = data.version.version || "2.1"
        } else if (data.versions) {
          // Multiple versions array (at root /compute/)
          const currentVersion = data.versions.find((v: { status: string }) => v.status === "CURRENT")
          versionString = currentVersion?.version || "2.1"
        }

        // Parse version components to handle dotted versions like 2.100
        return {
          version: versionString,
          supportsDescription: supportsDescriptionField(versionString),
        }
      } catch (error) {
        // Default to not supporting description if we can't determine version
        console.error("Failed to detect Nova version:", error)
        return {
          version: "2.1",
          supportsDescription: false,
        }
      }
    }),
  getFlavorById: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { flavorId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
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
  getFlavorsByProjectId: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        sortBy: z.string().optional().default("name"),
        sortDirection: z.string().optional().default("asc"),
        searchTerm: z.string().optional().default(""),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { sortBy, sortDirection, searchTerm } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        // Fetch public and private flavors separately.
        // is_public=false returns only private flavors accessible to the current project
        // (either created by it or explicitly shared with it), preventing cross-project visibility.
        let privateFlavorError: string | undefined
        const [publicFlavors, privateFlavors] = await Promise.all([
          fetchFlavors(compute, "true"),
          fetchFlavors(compute, "false").catch((err: unknown) => {
            // Swallow expected authorization errors — many users simply don't have
            // access to private flavors and that's fine.
            if (err instanceof TRPCError && err.code !== "INTERNAL_SERVER_ERROR") {
              return [] as Flavor[]
            }
            // For real server errors (500/502/503), surface a warning but still
            // return the public flavors so the page isn't completely broken.
            privateFlavorError = ERROR_CODES.FLAVORS_FETCH_FAILED
            return [] as Flavor[]
          }),
        ])

        const seen = new Set<string>()
        const flavors = [...publicFlavors, ...privateFlavors].filter((f) => {
          if (seen.has(f.id)) return false
          seen.add(f.id)
          return true
        })

        return {
          flavors: filterAndSortFlavors(flavors, searchTerm, sortBy as keyof Flavor, sortDirection),
          privateFlavorError,
        }
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
  createFlavor: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
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
          description: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavor } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        // Check if description is supported (microversion 2.55+)
        let supportsDescription = false
        let detectedVersion = "2.1"
        try {
          const versionResponse = await compute.get("")
          const versionData = await versionResponse.json()

          // The response can be either { version: {...} } or { versions: [...] }
          let versionString = "2.1"
          if (versionData.version) {
            // Single version object (when already at /v2.1/)
            versionString = versionData.version.version || "2.1"
          } else if (versionData.versions) {
            // Multiple versions array (at root /compute/)
            const currentVersion = versionData.versions.find((v: { status: string }) => v.status === "CURRENT")
            versionString = currentVersion?.version || "2.1"
          }

          detectedVersion = versionString
          supportsDescription = supportsDescriptionField(versionString)
        } catch {
          supportsDescription = false
        }

        // Remove description if not supported
        const flavorToSend = supportsDescription ? flavor : { ...flavor }
        if (!supportsDescription) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { description, ...rest } = flavorToSend
          Object.assign(flavorToSend, rest)
        }

        const flavorData: CreateFlavorInput = {
          ...flavorToSend,
          "OS-FLV-EXT-DATA:ephemeral": flavor["OS-FLV-EXT-DATA:ephemeral"] || 0,
        }

        const result = await createFlavor(compute, flavorData, supportsDescription ? detectedVersion : undefined)
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
  deleteFlavor: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavorId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
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
  createExtraSpecs: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
        extra_specs: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavorId, extra_specs } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
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
  getExtraSpecs: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { flavorId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
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

  deleteExtraSpec: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
        key: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavorId, key } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
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
  getFlavorAccess: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { flavorId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        let encodedId
        try {
          encodedId = validateAndEncodeResourceId(flavorId, "Flavor")
        } catch (error) {
          if (error instanceof SignalOpenstackError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: ERROR_CODES.GET_FLAVOR_ACCESS_FAILED,
              cause: error,
            })
          }
          throw error
        }

        // First, get the flavor details to check if it's public
        const flavorResponse = await compute.get(`flavors/${encodedId}`)
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
  addTenantAccess: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
        targetProjectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavorId, targetProjectId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const result = await addTenantAccess(compute, flavorId, targetProjectId)
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

  removeTenantAccess: projectScopedProcedure
    .input(
      z.object({
        project_id: z.string(),
        flavorId: z.string(),
        targetProjectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { flavorId, targetProjectId } = input

        // ctx.openstack is already rescoped to the project by projectScopedProcedure
        const compute = ctx.openstack?.service("compute")
        if (!compute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
          })
        }

        const result = await removeTenantAccess(compute, flavorId, targetProjectId)
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
