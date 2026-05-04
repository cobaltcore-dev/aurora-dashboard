import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { checkServiceAvailability } from "./"

// Mock the dependencies
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    redirect: vi.fn((args) => {
      if (args.href) {
        throw new Error(`Redirect to: ${args.href}`)
      }
      // Interpolate named params into the `to` string so assertions can use resolved paths
      let resolvedPath: string = args.to
      if (args.params) {
        for (const [key, value] of Object.entries(args.params as Record<string, string>)) {
          resolvedPath = resolvedPath.replace(`$${key}`, value ?? "")
        }
      }
      throw new Error(`Redirect to: ${resolvedPath}`)
    }),
  }
})

vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: vi.fn(),
}))

describe("Objects Route - checkServiceAvailability", () => {
  const defaultParams = {
    projectId: "proj-1",
    provider: "swift",
    containerName: "my-container",
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
      }).toThrow("Redirect to: /projects/proj-1/compute/overview")
    })

    it("calls redirect with correct params when no storage services available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      try {
        checkServiceAvailability([], defaultParams)
      } catch {
        // Expected to throw
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId/compute/overview",
        params: { projectId: "proj-1" },
      })
    })
  })

  describe("Object Storage Specific Checks", () => {
    it("does not throw when swift service is available and provider is 'swift'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).not.toThrow()
    })

    it("throws redirect when swift is not available but provider is 'swift'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/containers/my-container/objects")
    })

    it("throws redirect when ceph is not available but provider is 'ceph'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph" })
      }).toThrow("Redirect to: /projects/proj-1/storage/swift/containers/my-container/objects")
    })
  })

  describe("Edge Cases", () => {
    it("handles empty availableServices array", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        checkServiceAvailability([], defaultParams)
      }).toThrow()
    })

    it("calls redirect with correct params when swift is unavailable", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      const params = {
        projectId: "test-proj",
        provider: "swift",
        containerName: "test-container",
      }

      try {
        checkServiceAvailability(defaultServices, params)
      } catch {
        // Expected
      }

      // The implementation passes explicit params (not a spread), so the call
      // receives exactly { projectId, provider: "ceph", containerName }.
      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/containers/$containerName/objects",
        params: { projectId: "test-proj", provider: "ceph", containerName: "test-container" },
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

    it("redirects to ceph when object-store exists but swift is missing", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/containers/my-container/objects")
    })

    it("redirects to swift when object-store exists but ceph is missing", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph" })
      }).toThrow("Redirect to: /projects/proj-1/storage/swift/containers/my-container/objects")
    })

    it("redirects to projects when neither swift nor ceph is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {},
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/compute/overview")
    })
  })
})
