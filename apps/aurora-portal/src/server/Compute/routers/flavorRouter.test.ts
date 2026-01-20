import { describe, it, expect, vi, beforeEach } from "vitest"
import { flavorRouter } from "./flavorRouter"
import { Flavor } from "../types/flavor"
import { TRPCError } from "@trpc/server"
import * as flavorHelpers from "../helpers/flavorHelpers"
import { ERROR_CODES } from "../../errorCodes"
import { createCallerFactory, auroraRouter } from "../../trpc"

vi.mock("../helpers/flavorHelpers", () => ({
  fetchFlavors: vi.fn(),
  filterAndSortFlavors: vi.fn(),
  includesSearchTerm: vi.fn(),
  createFlavor: vi.fn(),
  deleteFlavor: vi.fn(),
  createExtraSpecs: vi.fn(),
  getExtraSpecs: vi.fn(),
  deleteExtraSpec: vi.fn(),
}))

const createMockContext = (shouldFailAuth = false, shouldFailRescope = false, shouldFailCompute = false) => ({
  validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
  createSession: vi.fn().mockResolvedValue({}),
  terminateSession: vi.fn().mockResolvedValue({}),
  rescopeSession: vi.fn().mockResolvedValue(
    shouldFailRescope
      ? null
      : {
          service: vi.fn().mockReturnValue(
            shouldFailCompute
              ? null
              : {
                  get: vi.fn().mockResolvedValue({
                    ok: true,
                    text: vi.fn().mockResolvedValue('{"flavors": []}'),
                  }),
                  post: vi.fn().mockResolvedValue({
                    ok: true,
                    text: vi.fn().mockResolvedValue('{"flavor": {}}'),
                  }),
                  del: vi.fn().mockResolvedValue({
                    ok: true,
                    status: 204,
                  }),
                }
          ),
        }
  ),
  getMultipartData: vi.fn().mockResolvedValue({}),
})

const createCaller = createCallerFactory(auroraRouter({ flavor: flavorRouter }))

describe("flavorRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getFlavorsByProjectId", () => {
    const mockFlavors: Flavor[] = [
      {
        id: "1",
        name: "m1.small",
        vcpus: 1,
        ram: 2048,
        disk: 20,
        description: "Small flavor",
        "OS-FLV-DISABLED:disabled": false,
        "OS-FLV-EXT-DATA:ephemeral": 0,
        "os-flavor-access:is_public": true,
      },
      {
        id: "2",
        name: "m1.large",
        vcpus: 4,
        ram: 8192,
        disk: 80,
        description: "Large flavor",
        "OS-FLV-DISABLED:disabled": false,
        "OS-FLV-EXT-DATA:ephemeral": 0,
        "os-flavor-access:is_public": true,
      },
    ]

    const filteredAndSortedFlavors: Flavor[] = [
      {
        id: "2",
        name: "m1.large",
        vcpus: 4,
        ram: 8192,
        disk: 80,
        description: "Large flavor",
        "OS-FLV-DISABLED:disabled": false,
        "OS-FLV-EXT-DATA:ephemeral": 0,
        "os-flavor-access:is_public": true,
      },
      {
        id: "1",
        name: "m1.small",
        vcpus: 1,
        ram: 2048,
        disk: 20,
        description: "Small flavor",
        "OS-FLV-DISABLED:disabled": false,
        "OS-FLV-EXT-DATA:ephemeral": 0,
        "os-flavor-access:is_public": true,
      },
    ]

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      const input = {
        projectId: "test-project-123",
      }

      await expect(caller.flavor.getFlavorsByProjectId(input)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(mockCtx.rescopeSession).not.toHaveBeenCalled()
    })

    it("should successfully fetch, filter and sort flavors", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
      vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(filteredAndSortedFlavors)

      const input = {
        projectId: "test-project-123",
        sortBy: "name",
        sortDirection: "desc",
        searchTerm: "m1",
      }

      const result = await caller.flavor.getFlavorsByProjectId(input)

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })

      expect(flavorHelpers.fetchFlavors).toHaveBeenCalledWith(
        expect.objectContaining({
          get: expect.any(Function),
          post: expect.any(Function),
          del: expect.any(Function),
        }),
        expect.any(String)
      )

      expect(flavorHelpers.filterAndSortFlavors).toHaveBeenCalledWith(mockFlavors, "m1", "name", "desc")
      expect(result).toEqual(filteredAndSortedFlavors)
    })

    it("should use default values for optional parameters", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
      vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(mockFlavors)

      const input = {
        projectId: "test-project-123",
      }

      const result = await caller.flavor.getFlavorsByProjectId(input)

      expect(flavorHelpers.fetchFlavors).toHaveBeenCalledWith(
        expect.objectContaining({
          get: expect.any(Function),
          post: expect.any(Function),
          del: expect.any(Function),
        }),
        expect.any(String)
      )

      expect(flavorHelpers.filterAndSortFlavors).toHaveBeenCalledWith(mockFlavors, "", "name", "asc")
      expect(result).toEqual(mockFlavors)
    })

    it("should throw INTERNAL_SERVER_ERROR when rescopeSession returns null", async () => {
      const mockCtx = createMockContext(false, true) // shouldFailRescope = true
      const caller = createCaller(mockCtx)

      const input = {
        projectId: "test-project-123",
      }

      await expect(caller.flavor.getFlavorsByProjectId(input)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "COMPUTE_SERVICE_UNAVAILABLE",
        })
      )

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(flavorHelpers.fetchFlavors).not.toHaveBeenCalled()
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true) // shouldFailCompute = true
      const caller = createCaller(mockCtx)

      const input = {
        projectId: "test-project-123",
      }

      await expect(caller.flavor.getFlavorsByProjectId(input)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "COMPUTE_SERVICE_UNAVAILABLE",
        })
      )

      expect(flavorHelpers.fetchFlavors).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCError from fetchFlavors without wrapping", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const originalTRPCError = new TRPCError({
        code: "UNAUTHORIZED",
        message: "Your session has expired. Please log in again.",
      })
      vi.mocked(flavorHelpers.fetchFlavors).mockRejectedValue(originalTRPCError)

      const input = {
        projectId: "test-project-123",
      }

      await expect(caller.flavor.getFlavorsByProjectId(input)).rejects.toThrow(originalTRPCError)
      expect(flavorHelpers.filterAndSortFlavors).not.toHaveBeenCalled()
    })

    it("should wrap non-TRPC errors from fetchFlavors", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const networkError = new Error("Network timeout")
      vi.mocked(flavorHelpers.fetchFlavors).mockRejectedValue(networkError)

      const input = {
        projectId: "test-project-123",
      }

      await expect(caller.flavor.getFlavorsByProjectId(input)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "FLAVORS_FETCH_FAILED",
          cause: networkError,
        })
      )
    })

    it("should handle all possible sortBy fields", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
      vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(mockFlavors)

      const sortByOptions = ["id", "name", "vcpus", "ram", "disk", "description"]

      for (const sortBy of sortByOptions) {
        vi.clearAllMocks()
        vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
        vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(mockFlavors)

        const input = {
          projectId: "test-project-123",
          sortBy,
          sortDirection: "desc",
        }

        await caller.flavor.getFlavorsByProjectId(input)
        expect(flavorHelpers.filterAndSortFlavors).toHaveBeenCalledWith(mockFlavors, "", sortBy, "desc")
      }
    })

    it("should handle both asc and desc sort directions", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
      vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(mockFlavors)

      await caller.flavor.getFlavorsByProjectId({
        projectId: "test-project-123",
        sortDirection: "asc",
      })

      expect(flavorHelpers.filterAndSortFlavors).toHaveBeenCalledWith(mockFlavors, "", "name", "asc")

      vi.clearAllMocks()
      vi.mocked(flavorHelpers.fetchFlavors).mockResolvedValue(mockFlavors)
      vi.mocked(flavorHelpers.filterAndSortFlavors).mockReturnValue(mockFlavors)

      await caller.flavor.getFlavorsByProjectId({
        projectId: "test-project-123",
        sortDirection: "desc",
      })

      expect(flavorHelpers.filterAndSortFlavors).toHaveBeenCalledWith(mockFlavors, "", "name", "desc")
    })
  })

  describe("createFlavor", () => {
    const mockCreatedFlavor: Flavor = {
      id: "new-flavor-id",
      name: "test-flavor",
      vcpus: 2,
      ram: 4096,
      disk: 20,
      description: "Test flavor description",
      swap: "128",
      rxtx_factor: 1.0,
      "OS-FLV-DISABLED:disabled": false,
      "OS-FLV-EXT-DATA:ephemeral": 0,
      "os-flavor-access:is_public": true,
    }

    const validFlavorInput = {
      projectId: "test-project-123",
      flavor: {
        name: "test-flavor",
        vcpus: 2,
        ram: 4096,
        disk: 20,
        swap: 128,
        rxtx_factor: 1.0,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      },
    }

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.createFlavor(validFlavorInput)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(flavorHelpers.createFlavor).not.toHaveBeenCalled()
    })

    it("should successfully create a flavor and return the result", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.createFlavor).mockResolvedValue(mockCreatedFlavor)

      const result = await caller.flavor.createFlavor(validFlavorInput)

      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })
      expect(flavorHelpers.createFlavor).toHaveBeenCalledWith(expect.objectContaining({ post: expect.any(Function) }), {
        name: "test-flavor",
        vcpus: 2,
        ram: 4096,
        disk: 20,
        swap: 128,
        rxtx_factor: 1.0,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      })
      expect(result).toEqual(mockCreatedFlavor)
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.createFlavor(validFlavorInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
        })
      )

      expect(flavorHelpers.createFlavor).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCErrors from createFlavor helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const helperError = new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.CREATE_FLAVOR_INVALID_DATA,
      })
      vi.mocked(flavorHelpers.createFlavor).mockRejectedValue(helperError)

      await expect(caller.flavor.createFlavor(validFlavorInput)).rejects.toThrow(helperError)
    })

    it("should wrap non-TRPC errors from createFlavor helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const genericError = new Error("Something went wrong")
      vi.mocked(flavorHelpers.createFlavor).mockRejectedValue(genericError)

      await expect(caller.flavor.createFlavor(validFlavorInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.CREATE_FLAVOR_FAILED,
          cause: genericError,
        })
      )
    })
  })

  describe("deleteFlavor", () => {
    const validDeleteInput = {
      projectId: "test-project-123",
      flavorId: "flavor-to-delete",
    }

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(mockCtx.rescopeSession).not.toHaveBeenCalled()
    })

    it("should successfully delete a flavor", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.deleteFlavor).mockResolvedValue(undefined)

      const result = await caller.flavor.deleteFlavor(validDeleteInput)

      expect(mockCtx.validateSession).toHaveBeenCalled()
      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })
      expect(flavorHelpers.deleteFlavor).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        "flavor-to-delete"
      )
      expect(result).toEqual({
        success: true,
        message: "Flavor deleted successfully",
      })
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
        })
      )

      expect(flavorHelpers.deleteFlavor).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCError from deleteFlavor helper without wrapping", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const originalTRPCError = new TRPCError({
        code: "NOT_FOUND",
        message: "The flavor could not be found. It may have already been deleted.",
      })
      vi.mocked(flavorHelpers.deleteFlavor).mockRejectedValue(originalTRPCError)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(originalTRPCError)
    })

    it("should re-throw TRPCError for flavor in use", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const flavorInUseError = new TRPCError({
        code: "BAD_REQUEST",
        message: "This flavor cannot be deleted because it is currently in use by existing servers.",
      })
      vi.mocked(flavorHelpers.deleteFlavor).mockRejectedValue(flavorInUseError)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(flavorInUseError)
    })

    it("should re-throw TRPCError for unauthorized deletion", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const unauthorizedError = new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete flavors in this project.",
      })
      vi.mocked(flavorHelpers.deleteFlavor).mockRejectedValue(unauthorizedError)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(unauthorizedError)
    })

    it("should wrap non-TRPC errors from deleteFlavor helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const networkError = new Error("Network timeout")
      vi.mocked(flavorHelpers.deleteFlavor).mockRejectedValue(networkError)

      await expect(caller.flavor.deleteFlavor(validDeleteInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.DELETE_FLAVOR_FAILED,
          cause: networkError,
        })
      )
    })

    it("should handle different flavorId formats", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.deleteFlavor).mockResolvedValue(undefined)

      const testCases = [
        "simple-id",
        "uuid-12345678-1234-1234-1234-123456789012",
        "flavor_with_underscores",
        "flavor-with-dashes",
        "123456789",
      ]

      for (const flavorId of testCases) {
        vi.clearAllMocks()
        vi.mocked(flavorHelpers.deleteFlavor).mockResolvedValue(undefined)

        const input = {
          projectId: "test-project-123",
          flavorId,
        }

        const result = await caller.flavor.deleteFlavor(input)

        expect(flavorHelpers.deleteFlavor).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          flavorId
        )
        expect(result).toEqual({
          success: true,
          message: "Flavor deleted successfully",
        })
      }
    })
  })
  describe("createExtraSpecs", () => {
    const validCreateExtraSpecsInput = {
      projectId: "test-project-123",
      flavorId: "test-flavor-id",
      extra_specs: {
        cpu: "dedicated",
        "hw:mem_page_size": "large",
      },
    }

    const mockCreatedExtraSpecs = {
      cpu: "dedicated",
      "hw:mem_page_size": "large",
    }

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.createExtraSpecs(validCreateExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(flavorHelpers.createExtraSpecs).not.toHaveBeenCalled()
    })

    it("should successfully create extra specs and return the result", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.createExtraSpecs).mockResolvedValue(mockCreatedExtraSpecs)

      const result = await caller.flavor.createExtraSpecs(validCreateExtraSpecsInput)

      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })
      expect(flavorHelpers.createExtraSpecs).toHaveBeenCalledWith(
        expect.objectContaining({ post: expect.any(Function) }),
        "test-flavor-id",
        {
          cpu: "dedicated",
          "hw:mem_page_size": "large",
        }
      )
      expect(result).toEqual(mockCreatedExtraSpecs)
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.createExtraSpecs(validCreateExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
        })
      )

      expect(flavorHelpers.createExtraSpecs).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCErrors from createExtraSpecs helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const helperError = new TRPCError({
        code: "CONFLICT",
        message: ERROR_CODES.CREATE_EXTRA_SPECS_CONFLICT,
      })
      vi.mocked(flavorHelpers.createExtraSpecs).mockRejectedValue(helperError)

      await expect(caller.flavor.createExtraSpecs(validCreateExtraSpecsInput)).rejects.toThrow(helperError)
    })

    it("should wrap non-TRPC errors from createExtraSpecs helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const genericError = new Error("Something went wrong")
      vi.mocked(flavorHelpers.createExtraSpecs).mockRejectedValue(genericError)

      await expect(caller.flavor.createExtraSpecs(validCreateExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.CREATE_EXTRA_SPECS_FAILED,
          cause: genericError,
        })
      )
    })

    it("should handle empty extra specs object", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.createExtraSpecs).mockResolvedValue({})

      const input = {
        projectId: "test-project-123",
        flavorId: "test-flavor-id",
        extra_specs: {},
      }

      const result = await caller.flavor.createExtraSpecs(input)

      expect(flavorHelpers.createExtraSpecs).toHaveBeenCalledWith(
        expect.objectContaining({ post: expect.any(Function) }),
        "test-flavor-id",
        {}
      )
      expect(result).toEqual({})
    })

    it("should handle various extra spec key formats", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const complexExtraSpecs = {
        cpu: "dedicated",
        "hw:mem_page_size": "large",
        "quota:vif_outbound_average": "1000",
        "hw_numa:numa_nodes": "2",
        "aggregate_instance_extra_specs:ssd": "true",
      }

      vi.mocked(flavorHelpers.createExtraSpecs).mockResolvedValue(complexExtraSpecs)

      const input = {
        projectId: "test-project-123",
        flavorId: "test-flavor-id",
        extra_specs: complexExtraSpecs,
      }

      const result = await caller.flavor.createExtraSpecs(input)

      expect(flavorHelpers.createExtraSpecs).toHaveBeenCalledWith(
        expect.objectContaining({ post: expect.any(Function) }),
        "test-flavor-id",
        complexExtraSpecs
      )
      expect(result).toEqual(complexExtraSpecs)
    })
  })

  describe("getExtraSpecs", () => {
    const validGetExtraSpecsInput = {
      projectId: "test-project-123",
      flavorId: "test-flavor-id",
    }

    const mockExtraSpecs = {
      cpu: "dedicated",
      "hw:mem_page_size": "large",
      "quota:vif_outbound_average": "1000",
    }

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.getExtraSpecs(validGetExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(flavorHelpers.getExtraSpecs).not.toHaveBeenCalled()
    })

    it("should successfully get extra specs and return the result", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.getExtraSpecs).mockResolvedValue(mockExtraSpecs)

      const result = await caller.flavor.getExtraSpecs(validGetExtraSpecsInput)

      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })
      expect(flavorHelpers.getExtraSpecs).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        "test-flavor-id"
      )
      expect(result).toEqual(mockExtraSpecs)
    })

    it("should return empty object when no extra specs exist", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.getExtraSpecs).mockResolvedValue({})

      const result = await caller.flavor.getExtraSpecs(validGetExtraSpecsInput)

      expect(result).toEqual({})
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.getExtraSpecs(validGetExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
        })
      )

      expect(flavorHelpers.getExtraSpecs).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCErrors from getExtraSpecs helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const helperError = new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.GET_EXTRA_SPECS_NOT_FOUND,
      })
      vi.mocked(flavorHelpers.getExtraSpecs).mockRejectedValue(helperError)

      await expect(caller.flavor.getExtraSpecs(validGetExtraSpecsInput)).rejects.toThrow(helperError)
    })

    it("should wrap non-TRPC errors from getExtraSpecs helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const genericError = new Error("Something went wrong")
      vi.mocked(flavorHelpers.getExtraSpecs).mockRejectedValue(genericError)

      await expect(caller.flavor.getExtraSpecs(validGetExtraSpecsInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.GET_EXTRA_SPECS_FAILED,
          cause: genericError,
        })
      )
    })

    it("should handle different flavor ID formats", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.getExtraSpecs).mockResolvedValue(mockExtraSpecs)

      const testFlavorIds = [
        "simple-id",
        "uuid-12345678-1234-1234-1234-123456789012",
        "flavor_with_underscores",
        "123456789",
      ]

      for (const flavorId of testFlavorIds) {
        vi.clearAllMocks()
        vi.mocked(flavorHelpers.getExtraSpecs).mockResolvedValue(mockExtraSpecs)

        const input = {
          projectId: "test-project-123",
          flavorId,
        }

        const result = await caller.flavor.getExtraSpecs(input)

        expect(flavorHelpers.getExtraSpecs).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          flavorId
        )
        expect(result).toEqual(mockExtraSpecs)
      }
    })
  })

  describe("deleteExtraSpec", () => {
    const validDeleteExtraSpecInput = {
      projectId: "test-project-123",
      flavorId: "test-flavor-id",
      key: "cpu",
    }

    it("should throw UNAUTHORIZED when session validation fails", async () => {
      const mockCtx = createMockContext(true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "The session is invalid",
        })
      )

      expect(flavorHelpers.deleteExtraSpec).not.toHaveBeenCalled()
    })

    it("should successfully delete an extra spec", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.deleteExtraSpec).mockResolvedValue(undefined)

      const result = await caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)

      expect(mockCtx.rescopeSession).toHaveBeenCalledWith({ projectId: "test-project-123" })
      expect(flavorHelpers.deleteExtraSpec).toHaveBeenCalledWith(
        expect.objectContaining({ del: expect.any(Function) }),
        "test-flavor-id",
        "cpu"
      )
      expect(result).toEqual({
        success: true,
        message: "Extra spec deleted successfully",
      })
    })

    it("should throw INTERNAL_SERVER_ERROR when compute service is unavailable", async () => {
      const mockCtx = createMockContext(false, false, true)
      const caller = createCaller(mockCtx)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE,
        })
      )

      expect(flavorHelpers.deleteExtraSpec).not.toHaveBeenCalled()
    })

    it("should re-throw TRPCErrors from deleteExtraSpec helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const helperError = new TRPCError({
        code: "NOT_FOUND",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_NOT_FOUND,
      })
      vi.mocked(flavorHelpers.deleteExtraSpec).mockRejectedValue(helperError)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(helperError)
    })

    it("should wrap non-TRPC errors from deleteExtraSpec helper", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const genericError = new Error("Something went wrong")
      vi.mocked(flavorHelpers.deleteExtraSpec).mockRejectedValue(genericError)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ERROR_CODES.DELETE_EXTRA_SPEC_FAILED,
          cause: genericError,
        })
      )
    })

    it("should handle various extra spec key formats", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.deleteExtraSpec).mockResolvedValue(undefined)

      const testKeys = [
        "cpu",
        "hw:mem_page_size",
        "quota:vif_outbound_average",
        "hw_numa:numa_nodes",
        "aggregate_instance_extra_specs:ssd",
        "os:type",
      ]

      for (const key of testKeys) {
        vi.clearAllMocks()
        vi.mocked(flavorHelpers.deleteExtraSpec).mockResolvedValue(undefined)

        const input = {
          projectId: "test-project-123",
          flavorId: "test-flavor-id",
          key,
        }

        const result = await caller.flavor.deleteExtraSpec(input)

        expect(flavorHelpers.deleteExtraSpec).toHaveBeenCalledWith(
          expect.objectContaining({ del: expect.any(Function) }),
          "test-flavor-id",
          key
        )
        expect(result).toEqual({
          success: true,
          message: "Extra spec deleted successfully",
        })
      }
    })

    it("should handle forbidden deletion error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const forbiddenError = new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_FORBIDDEN,
      })
      vi.mocked(flavorHelpers.deleteExtraSpec).mockRejectedValue(forbiddenError)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(forbiddenError)
    })

    it("should handle invalid key error", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      const invalidKeyError = new TRPCError({
        code: "BAD_REQUEST",
        message: ERROR_CODES.DELETE_EXTRA_SPEC_INVALID_KEY,
      })
      vi.mocked(flavorHelpers.deleteExtraSpec).mockRejectedValue(invalidKeyError)

      await expect(caller.flavor.deleteExtraSpec(validDeleteExtraSpecInput)).rejects.toThrow(invalidKeyError)
    })

    it("should handle different flavor ID and key combinations", async () => {
      const mockCtx = createMockContext()
      const caller = createCaller(mockCtx)

      vi.mocked(flavorHelpers.deleteExtraSpec).mockResolvedValue(undefined)

      const testCases = [
        { flavorId: "flavor-1", key: "cpu" },
        { flavorId: "uuid-12345678-1234-1234-1234-123456789012", key: "hw:mem_page_size" },
        { flavorId: "complex_flavor_name", key: "aggregate_instance_extra_specs:ssd" },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        vi.mocked(flavorHelpers.deleteExtraSpec).mockResolvedValue(undefined)

        const input = {
          projectId: "test-project-123",
          flavorId: testCase.flavorId,
          key: testCase.key,
        }

        const result = await caller.flavor.deleteExtraSpec(input)

        expect(flavorHelpers.deleteExtraSpec).toHaveBeenCalledWith(
          expect.objectContaining({ del: expect.any(Function) }),
          testCase.flavorId,
          testCase.key
        )
        expect(result).toEqual({
          success: true,
          message: "Extra spec deleted successfully",
        })
      }
    })
  })
})
