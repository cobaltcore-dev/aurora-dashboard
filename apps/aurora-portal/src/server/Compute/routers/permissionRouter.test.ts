import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { permissionRouter } from "./permissionRouter"

const createCaller = createCallerFactory(router(permissionRouter))

describe("permissionRouter", () => {
  let caller: ReturnType<typeof createCaller>
  let mockContext: AuroraPortalContext

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock context - this is the boundary between the router and the rest of the system
    const mockOpenstackSession = {
      getToken: vi.fn(() => ({
        tokenData: {
          project: { id: "test-project-id", name: "Test Project", domain: { id: "test", name: "Test" } },
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
      it("should throw UNAUTHORIZED when no OpenStack session exists", async () => {
        const mockContextWithoutOpenStack = {
          ...mockContext,
          openstack: null,
        } as unknown as AuroraPortalContext

        const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack)

        await expect(callerWithoutOpenStack.canUser("servers:list")).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })

      it("should throw UNAUTHORIZED when getToken returns null", async () => {
        const mockOpenstackSessionWithNullToken = {
          getToken: vi.fn(() => null),
        }

        const mockContextWithNullToken = {
          ...mockContext,
          openstack: mockOpenstackSessionWithNullToken,
        } as unknown as AuroraPortalContext

        const callerWithNullToken = createCaller(mockContextWithNullToken)

        await expect(callerWithNullToken.canUser("servers:list")).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })

      it("should throw UNAUTHORIZED when getToken returns undefined", async () => {
        const mockOpenstackSessionWithUndefinedToken = {
          getToken: vi.fn(() => undefined),
        }

        const mockContextWithUndefinedToken = {
          ...mockContext,
          openstack: mockOpenstackSessionWithUndefinedToken,
        } as unknown as AuroraPortalContext

        const callerWithUndefinedToken = createCaller(mockContextWithUndefinedToken)

        await expect(callerWithUndefinedToken.canUser("servers:list")).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })
    })

    describe("Permission key validation", () => {
      it("should throw BAD_REQUEST for unknown permission", async () => {
        await expect(caller.canUser("invalid:permission")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: invalid:permission" })
        )
      })

      it("should throw BAD_REQUEST for empty string", async () => {
        await expect(caller.canUser("")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: " })
        )
      })

      it("should throw BAD_REQUEST for malformed permission key", async () => {
        await expect(caller.canUser("just-a-string")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: just-a-string" })
        )
      })

      it("should throw BAD_REQUEST for partial permission key", async () => {
        await expect(caller.canUser("servers")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: servers" })
        )
      })
    })

    describe("Valid permission handling", () => {
      it("should accept valid server permissions", async () => {
        // These should not throw BAD_REQUEST errors - the actual policy result doesn't matter for this test
        await expect(caller.canUser("servers:list")).resolves.not.toThrow()
        await expect(caller.canUser("servers:create")).resolves.not.toThrow()
        await expect(caller.canUser("servers:delete")).resolves.not.toThrow()
        await expect(caller.canUser("servers:update")).resolves.not.toThrow()
      })

      it("should accept valid flavor permissions", async () => {
        await expect(caller.canUser("flavors:create")).resolves.not.toThrow()
        await expect(caller.canUser("flavors:delete")).resolves.not.toThrow()
        await expect(caller.canUser("flavors:update")).resolves.not.toThrow()
        await expect(caller.canUser("flavors:list_projects")).resolves.not.toThrow()
        await expect(caller.canUser("flavors:add_project")).resolves.not.toThrow()
        await expect(caller.canUser("flavors:remove_project")).resolves.not.toThrow()
      })

      it("should accept valid flavor spec permissions", async () => {
        await expect(caller.canUser("flavor_specs:list")).resolves.not.toThrow()
        await expect(caller.canUser("flavor_specs:create")).resolves.not.toThrow()
        await expect(caller.canUser("flavor_specs:update")).resolves.not.toThrow()
        await expect(caller.canUser("flavor_specs:delete")).resolves.not.toThrow()
      })

      it("should accept valid image permissions", async () => {
        await expect(caller.canUser("images:list")).resolves.not.toThrow()
        await expect(caller.canUser("images:create")).resolves.not.toThrow()
        await expect(caller.canUser("images:delete")).resolves.not.toThrow()
        await expect(caller.canUser("images:update")).resolves.not.toThrow()
      })
    })

    describe("Return type validation", () => {
      it("should return boolean for all valid permissions", async () => {
        const permissions = [
          "servers:list",
          "servers:create",
          "flavors:create",
          "flavor_specs:list",
          "images:list",
          "images:create",
        ]

        for (const permission of permissions) {
          const result = await caller.canUser(permission)
          expect(typeof result).toBe("boolean")
        }
      })

      it("should return consistent results for same permission", async () => {
        const result1 = await caller.canUser("servers:list")
        const result2 = await caller.canUser("servers:list")

        expect(typeof result1).toBe("boolean")
        expect(typeof result2).toBe("boolean")
        expect(result1).toBe(result2) // Should be consistent
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

        // Should not throw and should return a boolean
        const result = await callerWithoutProject.canUser("servers:list")
        expect(typeof result).toBe("boolean")
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

        // Should not throw and should return a boolean
        const result = await callerWithNoRoles.canUser("servers:list")
        expect(typeof result).toBe("boolean")
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
          const result = await callerWithRoles.canUser("servers:list")
          expect(typeof result).toBe("boolean")
        }
      })
    })

    describe("Error boundaries", () => {
      it("should handle getToken throwing an error", async () => {
        const mockOpenstackSessionWithError = {
          getToken: vi.fn(() => {
            throw new Error("Token retrieval failed")
          }),
        }

        const mockContextWithError = {
          ...mockContext,
          openstack: mockOpenstackSessionWithError,
        } as unknown as AuroraPortalContext

        const callerWithError = createCaller(mockContextWithError)

        await expect(callerWithError.canUser("servers:list")).rejects.toThrow("Token retrieval failed")
      })
    })

    describe("Multiple operations", () => {
      it("should handle multiple permission checks in sequence", async () => {
        const permissions = ["servers:list", "servers:create", "flavors:create", "images:list", "images:create"]

        const results = []
        for (const permission of permissions) {
          const result = await caller.canUser(permission)
          results.push(result)
          expect(typeof result).toBe("boolean")
        }

        // All results should be booleans
        expect(results.every((result) => typeof result === "boolean")).toBe(true)
      })

      it("should handle concurrent permission checks", async () => {
        const permissions = ["servers:list", "flavors:create", "images:list"]

        const promises = permissions.map((permission) => caller.canUser(permission))
        const results = await Promise.all(promises)

        results.forEach((result) => {
          expect(typeof result).toBe("boolean")
        })
      })
    })
  })

  describe("Bulk permissions", () => {
    describe("Array input validation", () => {
      it("should accept array of valid permission strings", async () => {
        const permissions = ["servers:list", "servers:create", "flavors:create"]
        const result = await caller.canUserBulk(permissions)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(3)
        result.forEach((item) => expect(typeof item).toBe("boolean"))
      })

      it("should return empty array for empty input array", async () => {
        const result = await caller.canUserBulk([])

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(0)
      })

      it("should throw BAD_REQUEST for array containing invalid permissions", async () => {
        const permissions = ["servers:list", "invalid:permission", "flavors:create"]

        await expect(caller.canUserBulk(permissions)).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: invalid:permission" })
        )
      })

      it("should throw BAD_REQUEST for array containing empty strings", async () => {
        const permissions = ["servers:list", "", "flavors:create"]

        await expect(caller.canUserBulk(permissions)).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: " })
        )
      })

      it("should throw BAD_REQUEST for array containing malformed permissions", async () => {
        const permissions = ["servers:list", "just-a-string", "flavors:create"]

        await expect(caller.canUserBulk(permissions)).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: just-a-string" })
        )
      })
    })

    describe("Authentication validation with arrays", () => {
      it("should throw UNAUTHORIZED for array input when no OpenStack session exists", async () => {
        const mockContextWithoutOpenStack = {
          ...mockContext,
          openstack: null,
        } as unknown as AuroraPortalContext
        const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack)

        await expect(callerWithoutOpenStack.canUserBulk(["servers:list", "flavors:create"])).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })

      it("should throw UNAUTHORIZED for array input when getToken returns null", async () => {
        const mockOpenstackSessionWithNullToken = {
          getToken: vi.fn(() => null),
        }
        const mockContextWithNullToken = {
          ...mockContext,
          openstack: mockOpenstackSessionWithNullToken,
        } as unknown as AuroraPortalContext
        const callerWithNullToken = createCaller(mockContextWithNullToken)

        await expect(callerWithNullToken.canUserBulk(["servers:list", "flavors:create"])).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })
    })

    describe("Bulk permission result consistency", () => {
      it("should return same results for bulk check as individual checks", async () => {
        const permissions = ["servers:list", "servers:create", "flavors:create", "images:list"]

        // Get bulk results
        const bulkResults = await caller.canUserBulk(permissions)

        // Get individual results
        const individualResults = await Promise.all(permissions.map((permission) => caller.canUser(permission)))

        expect(bulkResults).toEqual(individualResults)
      })

      it("should maintain order of permissions in results", async () => {
        const permissions = ["images:create", "servers:list", "flavors:delete", "servers:create"]

        const result = await caller.canUserBulk(permissions)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(4)

        // Verify each position corresponds to the correct permission by checking individual results
        for (let i = 0; i < permissions.length; i++) {
          const individualResult = await caller.canUser(permissions[i])
          expect(result[i]).toBe(individualResult)
        }
      })

      it("should handle duplicate permissions in array", async () => {
        const permissions = ["servers:list", "flavors:create", "servers:list", "images:list", "servers:list"]

        const result = await caller.canUserBulk(permissions)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(5)

        // All servers:list results should be the same
        const serversListResult = await caller.canUser("servers:list")
        expect(result[0]).toBe(serversListResult) // First servers:list
        expect(result[2]).toBe(serversListResult) // Second servers:list
        expect(result[4]).toBe(serversListResult) // Third servers:list
      })
    })

    describe("Large bulk operations", () => {
      it("should handle large arrays of permissions", async () => {
        const allPermissions = [
          "servers:list",
          "servers:create",
          "servers:delete",
          "servers:update",
          "flavors:create",
          "flavors:delete",
          "flavors:update",
          "flavors:list_projects",
          "flavors:add_project",
          "flavors:remove_project",
          "flavor_specs:list",
          "flavor_specs:create",
          "flavor_specs:update",
          "flavor_specs:delete",
          "images:list",
          "images:create",
          "images:delete",
          "images:update",
        ]

        const result = await caller.canUserBulk(allPermissions)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(allPermissions.length)
        result.forEach((item) => expect(typeof item).toBe("boolean"))
      })

      it("should handle mixed permission types efficiently", async () => {
        const mixedPermissions = [
          "servers:list",
          "flavors:create",
          "images:delete",
          "flavor_specs:update",
          "servers:create",
          "images:list",
          "flavors:delete",
          "flavor_specs:list",
        ]

        const startTime = Date.now()
        const result = await caller.canUserBulk(mixedPermissions)
        const endTime = Date.now()

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(mixedPermissions.length)
        result.forEach((item) => expect(typeof item).toBe("boolean"))

        // Should complete in reasonable time (adjust threshold as needed)
        expect(endTime - startTime).toBeLessThan(1000)
      })
    })

    describe("Error handling in bulk operations", () => {
      it("should stop processing and throw error on first invalid permission", async () => {
        const permissions = ["servers:list", "flavors:create", "invalid:permission", "images:list"]

        await expect(caller.canUserBulk(permissions)).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: invalid:permission" })
        )
      })

      it("should handle getToken errors during bulk operations", async () => {
        const mockOpenstackSessionWithError = {
          getToken: vi.fn(() => {
            throw new Error("Token retrieval failed")
          }),
        }
        const mockContextWithError = {
          ...mockContext,
          openstack: mockOpenstackSessionWithError,
        } as unknown as AuroraPortalContext
        const callerWithError = createCaller(mockContextWithError)

        await expect(callerWithError.canUserBulk(["servers:list", "flavors:create"])).rejects.toThrow(
          "Token retrieval failed"
        )
      })
    })

    describe("Context data handling with bulk operations", () => {
      it("should handle missing project data for bulk permissions", async () => {
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

        const permissions = ["servers:list", "flavors:create", "images:list"]
        const result = await callerWithoutProject.canUserBulk(permissions)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(3)
        result.forEach((item) => expect(typeof item).toBe("boolean"))
      })

      it("should handle different user roles for bulk permissions", async () => {
        const permissions = ["servers:list", "servers:create", "flavors:create"]
        const rolesTestCases = [
          [{ name: "admin", id: "admin-id" }],
          [{ name: "member", id: "member-id" }],
          [{ name: "reader", id: "reader-id" }],
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

          const result = await callerWithRoles.canUserBulk(permissions)
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(3)
          result.forEach((item) => expect(typeof item).toBe("boolean"))
        }
      })
    })

    describe("Performance and concurrency with bulk operations", () => {
      it("should handle concurrent bulk permission checks", async () => {
        const permissionSets = [
          ["servers:list", "servers:create"],
          ["flavors:create", "flavors:delete"],
          ["images:list", "images:create", "images:update"],
        ]

        const promises = permissionSets.map((permissions) => caller.canUserBulk(permissions))
        const results = await Promise.all(promises)

        expect(results).toHaveLength(3)
        expect(results[0]).toHaveLength(2)
        expect(results[1]).toHaveLength(2)
        expect(results[2]).toHaveLength(3)

        results.forEach((resultArray) => {
          expect(Array.isArray(resultArray)).toBe(true)
          resultArray.forEach((item) => expect(typeof item).toBe("boolean"))
        })
      })

      it("should maintain consistency between sequential bulk calls", async () => {
        const permissions = ["servers:list", "flavors:create", "images:list"]

        const result1 = await caller.canUserBulk(permissions)
        const result2 = await caller.canUserBulk(permissions)

        expect(result1).toEqual(result2)
      })
    })
  })
})
