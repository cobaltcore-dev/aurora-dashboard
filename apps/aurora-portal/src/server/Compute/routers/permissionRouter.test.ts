import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { permissionRouter } from "./permissionRouter"

const createCaller = createCallerFactory(router(permissionRouter))
type CanUserInput = Parameters<ReturnType<typeof createCaller>["canUser"]>[0]
type PermissionKey = Extract<CanUserInput["permission"], string>
type PermissionList = Extract<CanUserInput["permission"], PermissionKey[]>

describe("permissionRouter", () => {
  let caller: ReturnType<typeof createCaller>
  let mockContext: AuroraPortalContext
  const TEST_PROJECT_ID = "test-project-id"

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock context - this is the boundary between the router and the rest of the system
    const mockOpenstackSession = {
      getToken: vi.fn(() => ({
        tokenData: {
          project: { id: TEST_PROJECT_ID, name: "Test Project", domain: { id: "test", name: "Test" } },
          user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
          roles: [
            { name: "member", id: "member-role-id" },
            { name: "compute_viewer", id: "compute-viewer-role-id" },
          ],
        },
        authToken: "test-auth-token",
      })),
    }

    mockContext = {
      createSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      terminateSession: vi.fn().mockResolvedValue({}),
      validateSession: vi.fn().mockResolvedValue(true),
      openstack: mockOpenstackSession,
    } as unknown as AuroraPortalContext

    caller = createCaller(mockContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("canUser", () => {
    describe("Authentication validation", () => {
      it("should throw UNAUTHORIZED when rescoping fails", async () => {
        const mockContextWithFailedRescope = {
          ...mockContext,
          rescopeSession: vi.fn().mockResolvedValue(null),
        } as unknown as AuroraPortalContext

        const callerWithFailedRescope = createCaller(mockContextWithFailedRescope)

        await expect(
          callerWithFailedRescope.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        ).rejects.toMatchObject({
          code: "UNAUTHORIZED",
          message: expect.stringContaining("Failed to scope session to project"),
        })
      })

      it("should throw UNAUTHORIZED when no OpenStack session exists after rescoping", async () => {
        const mockContextWithNullSession = {
          ...mockContext,
          rescopeSession: vi.fn().mockResolvedValue({
            getToken: vi.fn(() => null),
          }),
        } as unknown as AuroraPortalContext

        const callerWithNullSession = createCaller(mockContextWithNullSession)

        await expect(
          callerWithNullSession.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        ).rejects.toMatchObject({
          code: "UNAUTHORIZED",
          message: "No valid OpenStack token found",
        })
      })

      it("should throw UNAUTHORIZED when getToken returns undefined after rescoping", async () => {
        const mockContextWithUndefinedToken = {
          ...mockContext,
          rescopeSession: vi.fn().mockResolvedValue({
            getToken: vi.fn(() => undefined),
          }),
        } as unknown as AuroraPortalContext

        const callerWithUndefinedToken = createCaller(mockContextWithUndefinedToken)

        await expect(
          callerWithUndefinedToken.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        ).rejects.toMatchObject({
          code: "UNAUTHORIZED",
          message: "No valid OpenStack token found",
        })
      })
    })

    describe("Permission key validation", () => {
      it("should throw BAD_REQUEST for unknown permission", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "invalid:permission" as unknown as PermissionKey })
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
        })
      })

      it("should throw BAD_REQUEST for empty string", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "" as unknown as PermissionKey })
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
        })
      })

      it("should throw BAD_REQUEST for malformed permission key", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "just-a-string" as unknown as PermissionKey })
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
        })
      })

      it("should throw BAD_REQUEST for partial permission key", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers" as unknown as PermissionKey })
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
        })
      })
    })

    describe("Valid permission handling", () => {
      it("should accept valid server permissions", async () => {
        // These should not throw BAD_REQUEST errors - the actual policy result doesn't matter for this test
        await expect(caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:create" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:delete" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:update" })
        ).resolves.not.toThrow()
      })

      it("should accept valid flavor permissions", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:create" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:delete" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:update" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:list_projects" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:add_project" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavors:remove_project" })
        ).resolves.not.toThrow()
      })

      it("should accept valid flavor spec permissions", async () => {
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavor_specs:list" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavor_specs:create" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavor_specs:update" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "flavor_specs:delete" })
        ).resolves.not.toThrow()
      })

      it("should accept valid image permissions", async () => {
        await expect(caller.canUser({ project_id: TEST_PROJECT_ID, permission: "images:list" })).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "images:create" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "images:delete" })
        ).resolves.not.toThrow()
        await expect(
          caller.canUser({ project_id: TEST_PROJECT_ID, permission: "images:update" })
        ).resolves.not.toThrow()
      })
    })

    describe("Return type validation", () => {
      it("should return array of booleans for single permission", async () => {
        const permissions: PermissionKey[] = [
          "servers:list",
          "servers:create",
          "flavors:create",
          "flavor_specs:list",
          "images:list",
        ]

        for (const permission of permissions) {
          const result = await caller.canUser({ project_id: TEST_PROJECT_ID, permission })
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(1)
          expect(typeof result[0]).toBe("boolean")
        }
      })

      it("should return array of booleans for array input", async () => {
        const permissions: PermissionList = ["servers:list", "servers:create", "flavors:create"]
        const result = await caller.canUser({ project_id: TEST_PROJECT_ID, permission: permissions })

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(3)
        result.forEach((item) => expect(typeof item).toBe("boolean"))
      })

      it("should return empty array for empty input", async () => {
        const result = await caller.canUser({ project_id: TEST_PROJECT_ID, permission: [] })

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(0)
      })

      it("should return consistent results for same permission", async () => {
        const result1 = await caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        const result2 = await caller.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })

        expect(Array.isArray(result1)).toBe(true)
        expect(Array.isArray(result2)).toBe(true)
        expect(result1).toEqual(result2)
      })
    })

    describe("Context data handling", () => {
      it("should handle missing project data", async () => {
        const mockOpenstackSessionWithoutProject = {
          getToken: vi.fn(() => ({
            tokenData: {
              project: undefined,
              user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
              roles: [{ name: "member", id: "member-role-id" }],
            },
            authToken: "test-auth-token",
          })),
        }

        const mockContextWithoutProject = {
          ...mockContext,
          openstack: mockOpenstackSessionWithoutProject,
        } as unknown as AuroraPortalContext

        const callerWithoutProject = createCaller(mockContextWithoutProject)

        // Should not throw and should return an array
        const result = await callerWithoutProject.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(1)
      })

      it("should handle empty roles array", async () => {
        const mockOpenstackSessionWithNoRoles = {
          getToken: vi.fn(() => ({
            tokenData: {
              project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
              user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
              roles: [], // No roles
            },
            authToken: "test-auth-token",
          })),
        }

        const mockContextWithNoRoles = {
          ...mockContext,
          openstack: mockOpenstackSessionWithNoRoles,
        } as unknown as AuroraPortalContext

        const callerWithNoRoles = createCaller(mockContextWithNoRoles)

        // Should not throw and should return an array
        const result = await callerWithNoRoles.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(1)
      })

      it("should handle different user roles", async () => {
        const rolesTestCases = [
          [{ name: "admin", id: "admin-id" }],
          [{ name: "member", id: "member-id" }],
          [{ name: "reader", id: "reader-id" }],
          [
            { name: "member", id: "member-id" },
            { name: "compute_admin", id: "compute-admin-id" },
          ],
        ]

        for (const roles of rolesTestCases) {
          const mockOpenstackSessionWithRoles = {
            getToken: vi.fn(() => ({
              tokenData: {
                project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
                user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
                roles,
              },
              authToken: "test-auth-token",
            })),
          }

          const mockContextWithRoles = {
            ...mockContext,
            openstack: mockOpenstackSessionWithRoles,
          } as unknown as AuroraPortalContext

          const callerWithRoles = createCaller(mockContextWithRoles)

          // Should handle any role configuration without throwing
          const result = await callerWithRoles.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(1)
        }
      })
    })

    describe("Error boundaries", () => {
      it("should handle getToken throwing an error after rescoping", async () => {
        const mockContextWithError = {
          ...mockContext,
          rescopeSession: vi.fn().mockResolvedValue({
            getToken: vi.fn(() => {
              throw new Error("Token retrieval failed")
            }),
          }),
        } as unknown as AuroraPortalContext

        const callerWithError = createCaller(mockContextWithError)

        await expect(
          callerWithError.canUser({ project_id: TEST_PROJECT_ID, permission: "servers:list" })
        ).rejects.toThrow("Token retrieval failed")
      })
    })

    describe("Multiple operations", () => {
      it("should handle multiple permission checks in sequence", async () => {
        const permissions: PermissionKey[] = [
          "servers:list",
          "servers:create",
          "flavors:create",
          "images:list",
          "images:create",
        ]

        const results = []
        for (const permission of permissions) {
          const result = await caller.canUser({ project_id: TEST_PROJECT_ID, permission })
          results.push(result)
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(1)
        }

        // All results should be arrays
        expect(results.every((result) => Array.isArray(result))).toBe(true)
      })

      it("should handle concurrent permission checks", async () => {
        const permissions: PermissionKey[] = ["servers:list", "flavors:create", "images:list"]

        const promises = permissions.map((permission) => caller.canUser({ project_id: TEST_PROJECT_ID, permission }))
        const results = await Promise.all(promises)

        results.forEach((result) => {
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(1)
        })
      })
    })
  })
})
