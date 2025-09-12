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

  describe("Permission Router", () => {
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

        await expect(callerWithoutOpenStack.canListServers()).rejects.toThrow(
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

        await expect(callerWithNullToken.canListServers()).rejects.toThrow(
          new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        )
      })
    })

    describe("canListServers action", () => {
      it("should return boolean result", async () => {
        const result = await caller.canListServers()
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
        const result = await callerWithCloudAdmin.canListServers()
        expect(result).toBe(true)
      })
    })

    it("should return true for compute_viewer role", async () => {
      const result = await caller.canListServers()
      expect(result).toBe(true)
    })

    it("should return true for member role", async () => {
      const mockOpenstackSessionNoProject = {
        getToken: vi.fn(() => ({
          tokenData: {
            project: { id: "test-project-id", name: "Test Project", domain: { id: "default", name: "Default" } },
            user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
            roles: [{ name: "member", id: "compute-member-role-id" }],
          },
          authToken: "test-auth-token",
        })),
      }

      const mockContextNoProject = {
        createSession: vi.fn().mockResolvedValue(mockOpenstackSessionNoProject),
        rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSessionNoProject),
        terminateSession: vi.fn().mockResolvedValue({}),
        validateSession: vi.fn().mockResolvedValue(true),
        openstack: mockOpenstackSessionNoProject,
      }

      const callerNoProject = createCaller(mockContextNoProject as unknown as AuroraPortalContext)
      const result = await callerNoProject.canListServers()
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
      const result = await callerWithNoRoles.canListServers()
      expect(result).toBe(false)
    })
  })
})
