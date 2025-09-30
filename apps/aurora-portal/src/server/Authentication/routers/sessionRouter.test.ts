import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sessionRouter } from "./sessionRouter"
import { createCallerFactory, router } from "../../trpc"
import { AuroraPortalContext } from "../../context"
import { TRPCError } from "@trpc/server"

// Create tRPC caller
const createCaller = createCallerFactory(router(sessionRouter))

describe("sessionRouter", () => {
  let caller: ReturnType<typeof createCaller>
  const mockOpenstackSession = {
    getToken: vi.fn(() => ({
      tokenData: {
        project: { id: "test-project-id", name: "Test Project", domain: { id: "test-domain", name: "Test Domain" } },
        user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
        domain: { id: "test-domain", name: "Test Domain" },
        roles: [
          { name: "member", id: "member-role-id" },
          { name: "compute_viewer", id: "compute-viewer-role-id" },
        ],
        catalog: [
          { name: "nova", type: "compute", endpoints: [{ url: "http://nova:8774" }] },
          { name: "keystone", type: "identity", endpoints: [{ url: "http://keystone:5000" }] },
          { name: "empty-service", type: "test", endpoints: [] }, // Service with no endpoints
        ],
      },
      authToken: "test-auth-token",
    })),
  }

  const mockContext = {
    createSession: vi.fn(),
    rescopeSession: vi.fn(),
    terminateSession: vi.fn(),
    validateSession: vi.fn(),
    openstack: mockOpenstackSession,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Set up default mock implementations
    mockContext.createSession.mockResolvedValue(mockOpenstackSession)
    mockContext.rescopeSession.mockResolvedValue(mockOpenstackSession)
    mockContext.terminateSession.mockResolvedValue({})
    mockContext.validateSession.mockResolvedValue(true)

    caller = createCaller(mockContext as unknown as AuroraPortalContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getCurrentUserSession", () => {
    it("should return token data when openstack session exists", async () => {
      const result = await caller.getCurrentUserSession()

      expect(result).toEqual({
        project: { id: "test-project-id", name: "Test Project", domain: { id: "test-domain", name: "Test Domain" } },
        user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
        domain: { id: "test-domain", name: "Test Domain" },
        roles: [
          { name: "member", id: "member-role-id" },
          { name: "compute_viewer", id: "compute-viewer-role-id" },
        ],
        catalog: [
          { name: "nova", type: "compute", endpoints: [{ url: "http://nova:8774" }] },
          { name: "keystone", type: "identity", endpoints: [{ url: "http://keystone:5000" }] },
          { name: "empty-service", type: "test", endpoints: [] },
        ],
      })
    })

    it("should return null when no openstack session exists", async () => {
      const mockContextWithoutOpenStack = {
        ...mockContext,
        openstack: null,
      }

      const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack as unknown as AuroraPortalContext)
      const result = await callerWithoutOpenStack.getCurrentUserSession()

      expect(result).toBeNull()
    })

    it("should return null when getToken returns null", async () => {
      const mockOpenstackSessionWithNullToken = {
        getToken: vi.fn(() => null),
      }

      const mockContextWithNullToken = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullToken,
      }

      const callerWithNullToken = createCaller(mockContextWithNullToken as unknown as AuroraPortalContext)
      const result = await callerWithNullToken.getCurrentUserSession()

      expect(result).toBeNull()
    })
  })

  describe("getAuthToken", () => {
    it("should return auth token when openstack session exists", async () => {
      const result = await caller.getAuthToken()

      expect(result).toBe("test-auth-token")
    })

    it("should return null when no openstack session exists", async () => {
      const mockContextWithoutOpenStack = {
        ...mockContext,
        openstack: null,
      }

      const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack as unknown as AuroraPortalContext)
      const result = await callerWithoutOpenStack.getAuthToken()

      expect(result).toBeNull()
    })

    it("should return null when getToken returns null", async () => {
      const mockOpenstackSessionWithNullToken = {
        getToken: vi.fn(() => null),
      }

      const mockContextWithNullToken = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullToken,
      }

      const callerWithNullToken = createCaller(mockContextWithNullToken as unknown as AuroraPortalContext)
      const result = await callerWithNullToken.getAuthToken()

      expect(result).toBeNull()
    })
  })

  describe("getCurrentScope", () => {
    it("should return project and domain when both exist", async () => {
      const result = await caller.getCurrentScope()

      expect(result).toEqual({
        project: { id: "test-project-id", name: "Test Project", domain: { id: "test-domain", name: "Test Domain" } },
        domain: { id: "test-domain", name: "Test Domain" },
      })
    })

    it("should return domain from tokenData when no project exists", async () => {
      const mockOpenstackSessionWithoutProject = {
        getToken: vi.fn(() => ({
          tokenData: {
            project: null,
            user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
            domain: { id: "domain-only", name: "Domain Only" },
            roles: [{ name: "member", id: "member-role-id" }],
          },
          authToken: "test-auth-token",
        })),
      }

      const mockContextWithoutProject = {
        ...mockContext,
        openstack: mockOpenstackSessionWithoutProject,
      }

      const callerWithoutProject = createCaller(mockContextWithoutProject as unknown as AuroraPortalContext)
      const result = await callerWithoutProject.getCurrentScope()

      expect(result).toEqual({
        project: null,
        domain: { id: "domain-only", name: "Domain Only" },
      })
    })

    it("should return null when no token exists", async () => {
      const mockOpenstackSessionWithNullToken = {
        getToken: vi.fn(() => null),
      }

      const mockContextWithNullToken = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullToken,
      }

      const callerWithNullToken = createCaller(mockContextWithNullToken as unknown as AuroraPortalContext)
      const result = await callerWithNullToken.getCurrentScope()

      expect(result).toBeNull()
    })

    it("should return null when no openstack session exists", async () => {
      const mockContextWithoutOpenStack = {
        ...mockContext,
        openstack: null,
      }

      const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack as unknown as AuroraPortalContext)
      const result = await callerWithoutOpenStack.getCurrentScope()

      expect(result).toBeNull()
    })
  })

  describe("setCurrentScope", () => {
    describe("domain type", () => {
      it("should rescope to domain and return domain scope", async () => {
        const mockRescopedSession = {
          getToken: vi.fn(() => ({
            tokenData: {
              project: null,
              domain: { id: "rescoped-domain", name: "Rescoped Domain" },
            },
            authToken: "rescoped-token",
          })),
        }

        mockContext.rescopeSession.mockResolvedValue(mockRescopedSession)

        const result = await caller.setCurrentScope({
          type: "domain",
          domainId: "rescoped-domain",
        })

        expect(mockContext.rescopeSession).toHaveBeenCalledWith({ domainId: "rescoped-domain" })
        expect(result).toEqual({
          project: null,
          domain: { id: "rescoped-domain", name: "Rescoped Domain" },
        })
      })

      it("should handle null session from rescopeSession", async () => {
        mockContext.rescopeSession.mockResolvedValue(null)

        const result = await caller.setCurrentScope({
          type: "domain",
          domainId: "test-domain",
        })

        expect(result).toEqual({
          project: null,
          domain: undefined,
        })
      })
    })

    describe("project type", () => {
      it("should rescope to project and return project scope", async () => {
        const mockRescopedSession = {
          getToken: vi.fn(() => ({
            tokenData: {
              project: {
                id: "rescoped-project",
                name: "Rescoped Project",
                domain: { id: "project-domain", name: "Project Domain" },
              },
            },
            authToken: "rescoped-token",
          })),
        }

        mockContext.rescopeSession.mockResolvedValue(mockRescopedSession)

        const result = await caller.setCurrentScope({
          type: "project",
          projectId: "rescoped-project",
        })

        expect(mockContext.rescopeSession).toHaveBeenCalledWith({ projectId: "rescoped-project" })
        expect(result).toEqual({
          project: {
            id: "rescoped-project",
            name: "Rescoped Project",
            domain: { id: "project-domain", name: "Project Domain" },
          },
          domain: { id: "project-domain", name: "Project Domain" },
        })
      })

      it("should handle null session from rescopeSession", async () => {
        mockContext.rescopeSession.mockResolvedValue(null)

        const result = await caller.setCurrentScope({
          type: "project",
          projectId: "test-project",
        })

        expect(result).toEqual({
          project: undefined,
          domain: undefined,
        })
      })
    })

    describe("unscoped type", () => {
      it("should rescope to unscoped and return null scope", async () => {
        const result = await caller.setCurrentScope({
          type: "unscoped",
          value: "any-value",
        })

        expect(mockContext.rescopeSession).toHaveBeenCalledWith({})
        expect(result).toEqual({
          project: null,
          domain: null,
        })
      })
    })
  })

  describe("createUserSession", () => {
    it("should create session and return token data", async () => {
      // Ensure the mock is properly set up for this specific test
      mockContext.createSession.mockResolvedValue(mockOpenstackSession)

      const result = await caller.createUserSession({
        user: "testuser",
        password: "testpass",
        domainName: "testdomain",
      })

      expect(mockContext.createSession).toHaveBeenCalledWith({
        user: "testuser",
        password: "testpass",
        domain: "testdomain",
      })

      expect(result).toEqual({
        project: { id: "test-project-id", name: "Test Project", domain: { id: "test-domain", name: "Test Domain" } },
        user: { id: "test-user-id", name: "test-user", domain: { id: "default", name: "Default" } },
        domain: { id: "test-domain", name: "Test Domain" },
        roles: [
          { name: "member", id: "member-role-id" },
          { name: "compute_viewer", id: "compute-viewer-role-id" },
        ],
        catalog: [
          { name: "nova", type: "compute", endpoints: [{ url: "http://nova:8774" }] },
          { name: "keystone", type: "identity", endpoints: [{ url: "http://keystone:5000" }] },
          { name: "empty-service", type: "test", endpoints: [] },
        ],
      })
    })

    it("should throw error when session creation returns null token data", async () => {
      const mockSessionWithNullToken = {
        getToken: vi.fn(() => null),
      }

      mockContext.createSession.mockResolvedValue(mockSessionWithNullToken)

      await expect(
        caller.createUserSession({
          user: "testuser",
          password: "testpass",
          domainName: "testdomain",
        })
      ).rejects.toThrow("Could not get token data")
    })

    it("should throw error when session creation returns session with null getToken", async () => {
      const mockSessionWithNullGetToken = {
        getToken: vi.fn(() => ({
          tokenData: null,
          authToken: "token",
        })),
      }

      mockContext.createSession.mockResolvedValue(mockSessionWithNullGetToken)

      await expect(
        caller.createUserSession({
          user: "testuser",
          password: "testpass",
          domainName: "testdomain",
        })
      ).rejects.toThrow("Could not get token data")
    })
  })

  describe("terminateUserSession", () => {
    it("should call terminateSession on context", async () => {
      await caller.terminateUserSession()

      expect(mockContext.terminateSession).toHaveBeenCalledTimes(1)
    })
  })

  describe("getAvailableServices", () => {
    it("should return filtered services with endpoints", async () => {
      const result = await caller.getAvailableServices()

      expect(result).toEqual([
        { name: "nova", type: "compute" },
        { name: "keystone", type: "identity" },
      ])
    })

    it("should throw UNAUTHORIZED when no openstack session exists", async () => {
      const mockContextWithoutOpenStack = {
        ...mockContext,
        openstack: null,
      }

      const callerWithoutOpenStack = createCaller(mockContextWithoutOpenStack as unknown as AuroraPortalContext)

      await expect(callerWithoutOpenStack.getAvailableServices()).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "OpenStack authentication token is required to access services",
        })
      )
    })

    it("should throw UNAUTHORIZED when getToken returns null", async () => {
      const mockOpenstackSessionWithNullToken = {
        getToken: vi.fn(() => null),
      }

      const mockContextWithNullToken = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullToken,
      }

      const callerWithNullToken = createCaller(mockContextWithNullToken as unknown as AuroraPortalContext)

      await expect(callerWithNullToken.getAvailableServices()).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "OpenStack authentication token is required to access services",
        })
      )
    })

    it("should handle empty catalog", async () => {
      const mockOpenstackSessionWithEmptyCatalog = {
        getToken: vi.fn(() => ({
          tokenData: {
            catalog: [],
          },
          authToken: "test-auth-token",
        })),
      }

      const mockContextWithEmptyCatalog = {
        ...mockContext,
        openstack: mockOpenstackSessionWithEmptyCatalog,
      }

      const callerWithEmptyCatalog = createCaller(mockContextWithEmptyCatalog as unknown as AuroraPortalContext)
      const result = await callerWithEmptyCatalog.getAvailableServices()

      expect(result).toEqual([])
    })

    it("should handle null catalog", async () => {
      const mockOpenstackSessionWithNullCatalog = {
        getToken: vi.fn(() => ({
          tokenData: {
            catalog: null,
          },
          authToken: "test-auth-token",
        })),
      }

      const mockContextWithNullCatalog = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullCatalog,
      }

      const callerWithNullCatalog = createCaller(mockContextWithNullCatalog as unknown as AuroraPortalContext)
      const result = await callerWithNullCatalog.getAvailableServices()

      expect(result).toEqual([])
    })

    it("should handle catalog with null items", async () => {
      const mockOpenstackSessionWithNullCatalogItems = {
        getToken: vi.fn(() => ({
          tokenData: {
            catalog: [
              { name: "nova", type: "compute", endpoints: [{ url: "http://nova:8774" }] },
              null, // null catalog item
              { name: "keystone", type: "identity", endpoints: [{ url: "http://keystone:5000" }] },
            ],
          },
          authToken: "test-auth-token",
        })),
      }

      const mockContextWithNullCatalogItems = {
        ...mockContext,
        openstack: mockOpenstackSessionWithNullCatalogItems,
      }

      const callerWithNullCatalogItems = createCaller(mockContextWithNullCatalogItems as unknown as AuroraPortalContext)
      const result = await callerWithNullCatalogItems.getAvailableServices()

      expect(result).toEqual([
        { name: "nova", type: "compute" },
        { name: "keystone", type: "identity" },
      ])
    })
  })
})
