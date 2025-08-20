import { describe, it, expect, vi, beforeEach } from "vitest"
import { flavorRouter } from "./flavorRouter"
import { Flavor } from "../types/flavor"
import { TRPCError } from "@trpc/server"
import * as flavorHelpers from "../helpers/flavorHelpers"

import { createCallerFactory, auroraRouter } from "../../trpc"

vi.mock("../helpers/flavorHelpers", () => ({
  fetchFlavors: vi.fn(),
  filterAndSortFlavors: vi.fn(),
  includesSearchTerm: vi.fn(),
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
                }
          ),
        }
  ),
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
      expect(flavorHelpers.fetchFlavors).toHaveBeenCalledWith(expect.objectContaining({ get: expect.any(Function) }))
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
          message: "Unable to connect to the compute service for this project.",
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
          message: "Unable to connect to the compute service for this project.",
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
          message: "Failed to fetch flavors",
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
})
