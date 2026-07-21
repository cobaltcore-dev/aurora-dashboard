import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect, notFound } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { checkServiceAvailability } from "../../../../-components/utils/serviceAvailability"

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
    notFound: vi.fn(() => {
      throw new Error("Not found")
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
    storageType: "containers",
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
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets/my-container/objects")
    })

    it("does not throw when ceph is not in catalog but cephFallbackEnabled is true", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // cephFallbackEnabled is hardcoded to true, so Ceph is always available
      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
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
        storageType: "containers",
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
        to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
        params: { projectId: "test-proj", provider: "ceph", storageType: "buckets", containerName: "test-container" },
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
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets/my-container/objects")
    })

    it("does not redirect when ceph is not in catalog but cephFallbackEnabled is true", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // cephFallbackEnabled is hardcoded to true, so Ceph is always available
      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      }).not.toThrow()
    })

    it("redirects to ceph when swift is not available (cephFallbackEnabled is true)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {},
      })

      // cephFallbackEnabled makes Ceph always available as fallback
      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets/my-container/objects")
    })
  })

  describe("Canonical storageType enforcement", () => {
    beforeEach(() => {
      // object-store present with swift; ceph is available via fallback. This lets
      // both providers pass availability so the canonical check is what's exercised.
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })
    })

    it("redirects swift + buckets to the canonical swift + containers path", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          ...defaultParams,
          provider: "swift",
          storageType: "buckets",
        })
      }).toThrow("Redirect to: /projects/proj-1/storage/swift/containers/my-container/objects")
    })

    it("redirects ceph + containers to the canonical ceph + buckets path", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          ...defaultParams,
          provider: "ceph",
          storageType: "containers",
        })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets/my-container/objects")
    })

    it("passes canonical params to redirect when normalizing the storageType segment", () => {
      try {
        checkServiceAvailability(defaultServices, {
          ...defaultParams,
          provider: "ceph",
          storageType: "containers",
        })
      } catch {
        // expected to throw
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
        params: { projectId: "proj-1", provider: "ceph", storageType: "buckets", containerName: "my-container" },
      })
    })

    it("does not redirect when storageType already matches the provider", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          ...defaultParams,
          provider: "ceph",
          storageType: "buckets",
        })
      }).not.toThrow()

      expect(() => {
        checkServiceAvailability(defaultServices, {
          ...defaultParams,
          provider: "swift",
          storageType: "containers",
        })
      }).not.toThrow()
    })
  })

  describe("Invalid provider handling (notFound)", () => {
    beforeEach(() => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })
    })

    it("throws notFound when provider is invalid", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          projectId: "proj-1",
          provider: "invalid",
          storageType: "containers",
          containerName: "my-container",
        })
      }).toThrow("Not found")

      expect(notFound).toHaveBeenCalled()
    })

    it("throws notFound when provider is neither swift nor ceph", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          projectId: "proj-1",
          provider: "s3",
          storageType: "buckets",
          containerName: "my-container",
        })
      }).toThrow("Not found")
    })
  })

  describe("Invalid storageType handling (notFound)", () => {
    beforeEach(() => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })
    })

    it("throws notFound when storageType is not 'containers' or 'buckets'", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          projectId: "proj-1",
          provider: "swift",
          storageType: "invalid",
          containerName: "my-container",
        })
      }).toThrow("Not found")

      expect(notFound).toHaveBeenCalled()
    })

    it("throws notFound for random storageType values", () => {
      expect(() => {
        checkServiceAvailability(defaultServices, {
          projectId: "proj-1",
          provider: "ceph",
          storageType: "objects",
          containerName: "my-container",
        })
      }).toThrow("Not found")
    })
  })
})
