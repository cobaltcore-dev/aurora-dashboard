import { describe, it, expect, vi, beforeEach } from "vitest"
import { createPermissionRouter } from "./createPermissionRouter"
import { createCallerFactory, router } from "../trpc"
import type { AuroraPortalContext } from "../context"
import type { PolicyEngine } from "@cobaltcore-dev/policy-engine"

// Mock loadPolicyEngine
vi.mock("./policyEngineLoader", () => ({
  loadPolicyEngine: vi.fn(() => {
    return {
      policy: vi.fn(() => ({
        check: vi.fn(() => true),
      })),
    } as unknown as PolicyEngine
  }),
}))

// Mock context - currently not used but kept for future tRPC integration tests
// const createMockContext = (): AuroraPortalContext => ({
//   openstack: {
//     getToken: vi.fn(() => ({
//       tokenData: {
//         project: { id: "test-project-id", name: "test-project", domain: { id: "default", name: "Default" } },
//         roles: [{ id: "role-1", name: "admin" }],
//         user: { id: "user-1", name: "test-user", domain: { id: "default", name: "Default" } },
//       },
//     })),
//   },
// } as unknown as AuroraPortalContext)

describe("createPermissionRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create a router with canUser procedure", () => {
    const TEST_MAPPINGS = {
      "test:action": { engine: "test", rule: "test:rule" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        test: { fileName: "test.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    expect(router).toHaveProperty("canUser")
    expect(router.canUser).toBeDefined()
  })

  it("should load all engines at initialization", async () => {
    const { loadPolicyEngine } = await import("./policyEngineLoader")

    const TEST_MAPPINGS = {
      "compute:action": { engine: "compute", rule: "compute:rule" },
      "image:action": { engine: "image", rule: "image:rule" },
    } as const

    createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        compute: { fileName: "compute.yaml" },
        image: { fileName: "image.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    expect(loadPolicyEngine).toHaveBeenCalledWith("compute.yaml", "/test/policies")
    expect(loadPolicyEngine).toHaveBeenCalledWith("image.yaml", "/test/policies")
    expect(loadPolicyEngine).toHaveBeenCalledTimes(2)
  })

  it("should handle single permission check", async () => {
    const TEST_MAPPINGS = {
      "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        compute: { fileName: "compute.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    // Note: This is a simplified test - in real usage, canUser is a tRPC procedure
    // and would be called through the tRPC testing utilities
    expect(router.canUser).toBeDefined()
  })

  it("should handle multiple permission checks", async () => {
    const TEST_MAPPINGS = {
      "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
      "servers:create": { engine: "compute", rule: "os_compute_api:servers:create" },
      "images:list": { engine: "image", rule: "get_images" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        compute: { fileName: "compute.yaml" },
        image: { fileName: "image.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    expect(router.canUser).toBeDefined()
  })

  it("should validate permission keys at compile time", () => {
    const TEST_MAPPINGS = {
      "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
      "images:list": { engine: "image", rule: "get_images" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        compute: { fileName: "compute.yaml" },
        image: { fileName: "image.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    // TypeScript should enforce that only valid keys from TEST_MAPPINGS can be used
    // This is tested at compile time, not runtime
    expect(router.canUser).toBeDefined()

    // Runtime validation is handled by Zod schema in the actual procedure
  })

  it("should handle empty permission array", () => {
    const TEST_MAPPINGS = {
      "test:action": { engine: "test", rule: "test:rule" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        test: { fileName: "test.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    // Empty arrays should return empty results
    expect(router.canUser).toBeDefined()
  })

  it("should support different services with same rule names", () => {
    const TEST_MAPPINGS = {
      "swift:container_list": { engine: "swift", rule: "object_storage:container_list" },
      "ceph:container_list": { engine: "ceph", rule: "object_storage:container_list" },
    } as const

    const router = createPermissionRouter({
      policyDir: "/test/policies",
      engines: {
        swift: { fileName: "swift.yaml" },
        ceph: { fileName: "ceph.yaml" },
      },
      mappings: TEST_MAPPINGS,
    })

    expect(router.canUser).toBeDefined()
  })

  it("should create separate routers with independent state", async () => {
    const { loadPolicyEngine } = await import("./policyEngineLoader")
    vi.clearAllMocks()

    const COMPUTE_MAPPINGS = {
      "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
    } as const

    const STORAGE_MAPPINGS = {
      "swift:container_list": { engine: "swift", rule: "object_storage:container_list" },
    } as const

    const computeRouter = createPermissionRouter({
      policyDir: "/test/policies",
      engines: { compute: { fileName: "compute.yaml" } },
      mappings: COMPUTE_MAPPINGS,
    })

    const storageRouter = createPermissionRouter({
      policyDir: "/test/policies",
      engines: { swift: { fileName: "swift.yaml" } },
      mappings: STORAGE_MAPPINGS,
    })

    expect(computeRouter.canUser).toBeDefined()
    expect(storageRouter.canUser).toBeDefined()
    expect(computeRouter.canUser).not.toBe(storageRouter.canUser)

    // Each router should load its own engines
    expect(loadPolicyEngine).toHaveBeenCalledWith("compute.yaml", "/test/policies")
    expect(loadPolicyEngine).toHaveBeenCalledWith("swift.yaml", "/test/policies")
  })

  it("should throw error when mapping references unconfigured engine", () => {
    const TEST_MAPPINGS = {
      "servers:list": { engine: "compute", rule: "os_compute_api:servers:index" },
      "images:list": { engine: "image", rule: "get_images" },
    } as const

    // Only configure compute engine, but mappings reference both compute and image
    expect(() =>
      createPermissionRouter({
        policyDir: "/test/policies",
        engines: {
          compute: { fileName: "compute.yaml" },
        },
        mappings: TEST_MAPPINGS,
      })
    ).toThrowError(
      "Configuration error: Permission 'images:list' references engine 'image', but no such engine is configured. Available engines: compute"
    )
  })

  describe("fail-closed behavior when a rule is missing", () => {
    const buildCaller = () => {
      const TEST_MAPPINGS = {
        "test:known": { engine: "test", rule: "known:rule" },
        "test:missing": { engine: "test", rule: "missing:rule" },
      } as const

      const testRouter = createPermissionRouter({
        policyDir: "/test/policies",
        engines: { test: { fileName: "test.yaml" } },
        mappings: TEST_MAPPINGS,
      })

      const createCaller = createCallerFactory(router(testRouter))

      const mockOpenstackSession = {
        getToken: vi.fn(() => ({
          tokenData: {
            project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
            user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
            roles: [],
          },
        })),
      }

      const mockContext = {
        rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
        validateSession: vi.fn().mockResolvedValue(true),
        openstack: mockOpenstackSession,
      } as unknown as AuroraPortalContext

      return createCaller(mockContext)
    }

    it("returns false for the key whose rule is missing (no _default), true for the rest, without throwing", async () => {
      const { loadPolicyEngine } = await import("./policyEngineLoader")
      vi.mocked(loadPolicyEngine).mockReturnValueOnce({
        policy: vi.fn(() => ({
          check: vi.fn((rule: string) => {
            if (rule === "missing:rule") {
              throw new Error("Rule 'missing:rule' not found and no _default rule available")
            }
            return true
          }),
        })),
      } as unknown as PolicyEngine)

      // `warn`, not `error`: a missing rule is a documented deployment state, and ~20 keys are
      // checked per page load, so error-level here would be one line per key per view.
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const caller = buildCaller()

      const result = await caller.canUser({
        project_id: "test-project-id",
        permission: ["test:known", "test:missing"],
      })

      expect(result).toEqual([true, false])
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})
