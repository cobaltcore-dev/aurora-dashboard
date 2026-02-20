import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { checkServiceAvailability } from "./$"

// Mock the dependencies
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    redirect: vi.fn((args) => {
      throw new Error(`Redirect to: ${args.to}`)
    }),
  }
})

vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: vi.fn(),
}))

describe("Storage Route - checkServiceAvailability", () => {
  const defaultParams = {
    accountId: "acc-1",
    projectId: "proj-1",
    _splat: "",
  }

  const defaultServices = [
    { type: "object-store", name: "swift" },
    { type: "compute", name: "nova" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Service Availability Checks", () => {
    it("does not throw when object-store service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("throws redirect when no object-store service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        compute: {
          nova: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).toThrow("Redirect to: /accounts/$accountId/projects")
    })

    it("calls redirect with correct params when no storage services available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      try {
        checkServiceAvailability([], defaultParams)
      } catch {
        // Expected to throw
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/accounts/$accountId/projects",
        params: { accountId: "acc-1" },
      })
    })
  })

  describe("Object Storage Specific Checks", () => {
    it("does not throw when swift is available and splat is objectstorage", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      const params = { ...defaultParams, _splat: "objectstorage" }

      expect(() => {
        checkServiceAvailability(defaultServices, params)
      }).not.toThrow()
    })

    it("throws redirect when swift is not available but splat is objectstorage", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          // swift is missing/false
        },
      })

      const params = { ...defaultParams, _splat: "objectstorage" }

      expect(() => {
        checkServiceAvailability(defaultServices, params)
      }).toThrow("Redirect to: /accounts/$accountId/projects/$projectId/storage/$")
    })
  })

  describe("Edge Cases", () => {
    it("handles empty availableServices array", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        checkServiceAvailability([], defaultParams)
      }).toThrow()
    })

    it("handles undefined _splat parameter", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      const params = {
        accountId: "acc-1",
        projectId: "proj-1",
        _splat: undefined,
      }

      expect(() => {
        checkServiceAvailability(defaultServices, params)
      }).not.toThrow()
    })

    it("preserves all params in redirect", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {},
      })

      const params = {
        accountId: "test-acc",
        projectId: "test-proj",
        _splat: "objectstorage",
      }

      try {
        checkServiceAvailability(defaultServices, params)
      } catch {
        // Expected
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/accounts/$accountId/projects/$projectId/storage/$",
        params: {
          accountId: "test-acc",
          projectId: "test-proj",
          _splat: undefined,
        },
      })
    })
  })

  describe("Multiple Storage Services", () => {
    it("accepts when multiple object-store services exist including swift", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("redirects when object-store exists but swift is missing for objectstorage route", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      const params = { ...defaultParams, _splat: "objectstorage" }

      expect(() => {
        checkServiceAvailability(defaultServices, params)
      }).toThrow("Redirect to: /accounts/$accountId/projects/$projectId/storage/$")
    })
  })
})
