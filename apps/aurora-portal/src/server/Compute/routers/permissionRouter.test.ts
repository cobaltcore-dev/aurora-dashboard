import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { permissionRouter } from "./permissionRouter"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { TRPCError } from "@trpc/server"

vi.mock("@/server/policyEngineLoader", () => {
  const mockPolicyCheck = vi.fn()
  const mockPolicy = vi.fn(() => ({
    check: mockPolicyCheck,
  }))
  const mockPolicyEngine = {
    policy: mockPolicy,
  }

  return {
    loadPolicyEngine: vi.fn(() => mockPolicyEngine),
    __mockPolicyCheck: mockPolicyCheck,
    __mockPolicy: mockPolicy,
  }
})

const createCaller = createCallerFactory(router(permissionRouter))

describe("permissionRouter", () => {
  let caller: ReturnType<typeof createCaller>
  let mockPolicyCheck: ReturnType<typeof vi.fn>
  let mockPolicy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const policyEngineModule = await import("@/server/policyEngineLoader")
    mockPolicyCheck = (policyEngineModule as any).__mockPolicyCheck
    mockPolicy = (policyEngineModule as any).__mockPolicy

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

    describe("Compute permissions", () => {
      describe("servers:list", () => {
        it("should call policy check with correct rule", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("servers:list")

          expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:servers:index")
          expect(result).toBe(true)
        })

        it("should return true when policy allows", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("servers:list")
          expect(result).toBe(true)
        })

        it("should return false when policy denies", async () => {
          mockPolicyCheck.mockReturnValue(false)

          const result = await caller.canUser("servers:list")
          expect(result).toBe(false)
        })

        it("should return true for cloud_compute_admin", async () => {
          mockPolicyCheck.mockReturnValue(true)

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
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("servers:list")
          expect(result).toBe(true)
        })

        it("should return true for member role", async () => {
          mockPolicyCheck.mockReturnValue(true)

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
          mockPolicyCheck.mockReturnValue(false)

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
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("flavors:create")

          expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:os-flavor-manage:create")
          expect(result).toBe(true)
        })

        it("should handle flavors:delete permission", async () => {
          mockPolicyCheck.mockReturnValue(false)

          const result = await caller.canUser("flavors:delete")

          expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:os-flavor-manage:delete")
          expect(result).toBe(false)
        })

        it("should handle flavors:update permission", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("flavors:update")

          expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:os-flavor-manage:update")
          expect(result).toBe(true)
        })

        it("should handle flavor_specs:list permission", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("flavor_specs:list")

          expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:os-flavor-extra-specs:index")
          expect(result).toBe(true)
        })
      })
    })

    describe("Image permissions", () => {
      describe("images:list", () => {
        it("should call policy check with correct rule", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("images:list")

          expect(mockPolicyCheck).toHaveBeenCalledWith("get_images")
          expect(result).toBe(true)
        })

        it("should return true for image admin roles", async () => {
          mockPolicyCheck.mockReturnValue(true)

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
          expect(result).toBe(true)
        })

        it("should return false when access denied", async () => {
          mockPolicyCheck.mockReturnValue(false)

          const result = await caller.canUser("images:list")
          expect(result).toBe(false)
        })
      })

      describe("other image permissions", () => {
        it("should handle images:create permission", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("images:create")

          expect(mockPolicyCheck).toHaveBeenCalledWith("add_image")
          expect(result).toBe(true)
        })

        it("should handle images:delete permission", async () => {
          mockPolicyCheck.mockReturnValue(false)

          const result = await caller.canUser("images:delete")

          expect(mockPolicyCheck).toHaveBeenCalledWith("delete_image")
          expect(result).toBe(false)
        })

        it("should handle images:update permission", async () => {
          mockPolicyCheck.mockReturnValue(true)

          const result = await caller.canUser("images:update")

          expect(mockPolicyCheck).toHaveBeenCalledWith("modify_image")
          expect(result).toBe(true)
        })
      })
    })

    describe("Multiple engines", () => {
      it("should handle both compute and image permissions in same context", async () => {
        mockPolicyCheck.mockReturnValue(true)

        const computeResult = await caller.canUser("servers:list")
        const imageResult = await caller.canUser("images:list")

        expect(computeResult).toBe(true)
        expect(imageResult).toBe(true)

        expect(mockPolicyCheck).toHaveBeenCalledWith("os_compute_api:servers:index")
        expect(mockPolicyCheck).toHaveBeenCalledWith("get_images")
      })

      it("should correctly route to different policy engines", async () => {
        mockPolicyCheck.mockReturnValue(true)

        const permissions = [
          { key: "servers:list", rule: "os_compute_api:servers:index" },
          { key: "flavors:create", rule: "os_compute_api:os-flavor-manage:create" },
          { key: "images:list", rule: "get_images" },
          { key: "images:create", rule: "add_image" },
        ]

        for (const permission of permissions) {
          const result = await caller.canUser(permission.key)
          expect(result).toBe(true)
          expect(mockPolicyCheck).toHaveBeenCalledWith(permission.rule)
        }
      })

      it("should handle mixed results from different engines", async () => {
        mockPolicyCheck
          .mockReturnValueOnce(true) // servers:list
          .mockReturnValueOnce(false) // images:list
          .mockReturnValueOnce(true) // flavors:create
          .mockReturnValueOnce(false) // images:delete

        const serversResult = await caller.canUser("servers:list")
        const imagesResult = await caller.canUser("images:list")
        const flavorsResult = await caller.canUser("flavors:create")
        const imageDeleteResult = await caller.canUser("images:delete")

        expect(serversResult).toBe(true)
        expect(imagesResult).toBe(false)
        expect(flavorsResult).toBe(true)
        expect(imageDeleteResult).toBe(false)
      })
    })

    describe("Policy engine configuration", () => {
      it("should pass correct token data to policy engine", async () => {
        mockPolicyCheck.mockReturnValue(true)

        await caller.canUser("servers:list")

        expect(mockPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            project: expect.objectContaining({
              id: "test-project-id",
              name: "Test Project",
            }),
            user: expect.objectContaining({
              id: "test-user-id",
              name: "test-user",
            }),
            roles: expect.arrayContaining([
              expect.objectContaining({ name: "member" }),
              expect.objectContaining({ name: "compute_viewer" }),
            ]),
          }),
          expect.objectContaining({
            debug: true,
            defaultParams: { project_id: "test-project-id" },
          })
        )
      })
    })
  })
})
