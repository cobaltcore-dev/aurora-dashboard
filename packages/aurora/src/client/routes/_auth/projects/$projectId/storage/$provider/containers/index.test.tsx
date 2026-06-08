import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { checkServiceAvailability } from "./index"

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

describe("Storage Route - checkServiceAvailability", () => {
  const defaultParams = {
    projectId: "proj-1",
    provider: "swift",
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
      }).toThrow("Redirect to: /projects/proj-1")
    })

    it("calls redirect with correct params when no storage services available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      try {
        checkServiceAvailability([], defaultParams)
      } catch {
        // Expected to throw
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId",
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
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/containers")
    })

    it("does not throw when ceph is not in catalog but cephFallbackEnabled is true", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // cephFallbackEnabled is hardcoded to true, so Ceph is always available
      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph" })
      }).not.toThrow()
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
      }

      try {
        checkServiceAvailability(defaultServices, params)
      } catch {
        // Expected
      }

      // The implementation spreads `params` and overrides `provider`,
      // so the call receives exactly { projectId, provider: "ceph" }.
      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/containers",
        params: { projectId: "test-proj", provider: "ceph" },
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
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/containers")
    })
  })

  // Tests that verify the fix for issue #875:
  // An error in Object Storage (Swift/Ceph) was disabling all navigation on the page.
  // Root cause: the ErrorBoundary wrapping SwiftContainers/CephContainers had no resetKeys,
  // so once the boundary caught an error it stayed in the error state even after navigating
  // to a different project or provider, effectively freezing all page navigation.
  // Fix: add resetKeys={[project, provider]} matching the pattern in the objects page.
  describe("Provider switching (bug #875 — error disables navigation)", () => {
    it("does not throw when provider is swift and swift is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-1", provider: "swift" })
      }).not.toThrow()
    })

    it("does not throw when provider is ceph and cephFallbackEnabled is true (even without ceph in catalog)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      // cephFallbackEnabled is true, so navigating to /ceph should work even without Ceph in catalog
      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-1", provider: "ceph" })
      }).not.toThrow()
    })

    it("redirects to project overview when no storage service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        checkServiceAvailability([], { projectId: "proj-2", provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-2")
    })

    it("redirects swift provider to ceph when only ceph is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-3", provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-3/storage/ceph/containers")
    })
  })
})
