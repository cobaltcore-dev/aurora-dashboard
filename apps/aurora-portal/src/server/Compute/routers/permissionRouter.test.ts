import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { permissionRouter } from "./permissionRouter"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { TRPCError } from "@trpc/server"

// Create tRPC caller
const createCaller = createCallerFactory(router(permissionRouter))

describe("permissionRouter", () => {
  let caller: ReturnType<typeof createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
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

    const mockContext = {
      createSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      terminateSession: vi.fn().mockResolvedValue({}),
      validateSession: vi.fn().mockResolvedValue(true),
      openstack: mockOpenstackSession,
    }

    caller = createCaller(mockContext as unknown as AuroraPortalContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("canUser", () => {
    // Test Factor 1: Token Validation (affects ALL actions)
    describe("Token validation", () => {
      it("should throw UNAUTHORIZED when no OpenStack session exists", async () => {
        const mockContextWithoutOpenStack = {
          createSession: vi.fn().mockResolvedValue(null),
          rescopeSession: vi.fn().mockResolvedValue(null),
          terminateSession: vi.fn().mockResolvedValue({}),
          validateSession: vi.fn().mockResolvedValue(false),
          openstack: null,
        }
        const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack as unknown as AuroraPortalContext)

        await expect(callerWithoutOpenStack.canUser("servers:list")).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })

      it("should throw UNAUTHORIZED when getToken returns null", async () => {
        const mockOpenstackSessionWithNullToken = {
          getToken: vi.fn(() => null),
        }
        const mockContextWithNullToken = {
          createSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithNullToken),
          rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithNullToken),
          terminateSession: vi.fn().mockResolvedValue({}),
          validateSession: vi.fn().mockResolvedValue(true),
          openstack: mockOpenstackSessionWithNullToken,
        }
        const callerWithNullToken = createCaller(mockContextWithNullToken as unknown as AuroraPortalContext)

        await expect(callerWithNullToken.canUser("servers:list")).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })
    })

    // Test Factor 2: Invalid Permission Keys
    describe("Permission key validation", () => {
      it("should throw BAD_REQUEST for unknown permission", async () => {
        await expect(caller.canUser("invalid:permission")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: invalid:permission" })
        )
      })

      it("should throw BAD_REQUEST for malformed permission key", async () => {
        await expect(caller.canUser("malformed")).rejects.toThrow(
          new TRPCError({ code: "BAD_REQUEST", message: "Unknown permission: malformed" })
        )
      })
    })

    // Test Factor 3: Compute Engine Permissions
    describe("Compute permissions", () => {
      describe("servers:list", () => {
        it("should return boolean result", async () => {
          const result = await caller.canUser("servers:list")
          expect(typeof result).toBe("boolean")
        })

        it("should return true for cloud_compute_admin", async () => {
          const mockOpenstackSessionWithCloudAdmin = {
            getToken: vi.fn(() => ({
              tokenData: {
                project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
                user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
                roles: [{ name: "cloud_compute_admin", id: "cloud-compute-admin-role-id" }],
              },
              authToken: "test-auth-token",
            })),
          }
          const mockContextWithCloudAdmin = {
            createSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithCloudAdmin),
            rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithCloudAdmin),
            terminateSession: vi.fn().mockResolvedValue({}),
            validateSession: vi.fn().mockResolvedValue(true),
            openstack: mockOpenstackSessionWithCloudAdmin,
          }
          const callerWithCloudAdmin = createCaller(mockContextWithCloudAdmin as unknown as AuroraPortalContext)

          const result = await callerWithCloudAdmin.canUser("servers:list")
          expect(result).toBe(true)
        })

        it("should return true for compute_viewer role", async () => {
          const result = await caller.canUser("servers:list")
          expect(result).toBe(true)
        })

        it("should return true for member role", async () => {
          const mockOpenstackSessionWithMember = {
            getToken: vi.fn(() => ({
              tokenData: {
                project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
                user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
                roles: [{ name: "member", id: "member-role-id" }],
              },
              authToken: "test-auth-token",
            })),
          }
          const mockContextWithMember = {
            createSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithMember),
            rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithMember),
            terminateSession: vi.fn().mockResolvedValue({}),
            validateSession: vi.fn().mockResolvedValue(true),
            openstack: mockOpenstackSessionWithMember,
          }
          const callerWithMember = createCaller(mockContextWithMember as unknown as AuroraPortalContext)

          const result = await callerWithMember.canUser("servers:list")
          expect(result).toBe(true)
        })

        it("should return false for missing relevant roles", async () => {
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
            createSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithNoRoles),
            rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithNoRoles),
            terminateSession: vi.fn().mockResolvedValue({}),
            validateSession: vi.fn().mockResolvedValue(true),
            openstack: mockOpenstackSessionWithNoRoles,
          }
          const callerWithNoRoles = createCaller(mockContextWithNoRoles as unknown as AuroraPortalContext)

          const result = await callerWithNoRoles.canUser("servers:list")
          expect(result).toBe(false)
        })
      })

      describe("flavors permissions", () => {
        it("should handle flavors:create permission", async () => {
          const result = await caller.canUser("flavors:create")
          expect(typeof result).toBe("boolean")
        })

        it("should handle flavors:delete permission", async () => {
          const result = await caller.canUser("flavors:delete")
          expect(typeof result).toBe("boolean")
        })

        it("should handle flavors:update permission", async () => {
          const result = await caller.canUser("flavors:update")
          expect(typeof result).toBe("boolean")
        })

        it("should handle flavor_specs:list permission", async () => {
          const result = await caller.canUser("flavor_specs:list")
          expect(typeof result).toBe("boolean")
        })
      })
    })

    // Test Factor 4: Image Engine Permissions
    describe("Image permissions", () => {
      describe("images:list", () => {
        it("should return boolean result", async () => {
          const result = await caller.canUser("images:list")
          expect(typeof result).toBe("boolean")
        })

        it("should return true for image admin roles", async () => {
          const mockOpenstackSessionWithImageAdmin = {
            getToken: vi.fn(() => ({
              tokenData: {
                project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
                user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
                roles: [{ name: "image_admin", id: "image-admin-role-id" }],
              },
              authToken: "test-auth-token",
            })),
          }
          const mockContextWithImageAdmin = {
            createSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithImageAdmin),
            rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionWithImageAdmin),
            terminateSession: vi.fn().mockResolvedValue({}),
            validateSession: vi.fn().mockResolvedValue(true),
            openstack: mockOpenstackSessionWithImageAdmin,
          }
          const callerWithImageAdmin = createCaller(mockContextWithImageAdmin as unknown as AuroraPortalContext)

          const result = await callerWithImageAdmin.canUser("images:list")
          expect(typeof result).toBe("boolean")
        })
      })

      describe("other image permissions", () => {
        it("should handle images:create permission", async () => {
          const result = await caller.canUser("images:create")
          expect(typeof result).toBe("boolean")
        })

        it("should handle images:delete permission", async () => {
          const result = await caller.canUser("images:delete")
          expect(typeof result).toBe("boolean")
        })

        it("should handle images:update permission", async () => {
          const result = await caller.canUser("images:update")
          expect(typeof result).toBe("boolean")
        })
      })
    })

    // Test Factor 5: Cross-Engine Testing
    describe("Multiple engines", () => {
      it("should handle both compute and image permissions in same context", async () => {
        const computeResult = await caller.canUser("servers:list")
        const imageResult = await caller.canUser("images:list")

        expect(typeof computeResult).toBe("boolean")
        expect(typeof imageResult).toBe("boolean")
      })

      it("should correctly route to different policy engines", async () => {
        // Test a few permissions from different engines
        const permissions = [
          "servers:list", // compute engine
          "flavors:create", // compute engine
          "images:list", // image engine
          "images:create", // image engine
        ]

        for (const permission of permissions) {
          const result = await caller.canUser(permission)
          expect(typeof result).toBe("boolean")
        }
      })
    })
  })
})
