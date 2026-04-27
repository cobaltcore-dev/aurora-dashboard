import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { securityGroupRouter } from "./securityGroupRouter"
import { SecurityGroup } from "../types/securityGroup"
import { AuroraPortalContext } from "@/server/context"

// Test constants
const TEST_PROJECT_ID = "proj-1"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  mockSecurityGroups?: SecurityGroup[]
  mockSecurityGroup?: SecurityGroup
  mockError?: boolean
  rescopeFails?: boolean
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    mockSecurityGroups,
    mockSecurityGroup,
    mockError,
    rescopeFails = false,
  } = opts || {}

  const defaultSecurityGroups = [
    {
      id: "sg-1",
      name: "default",
      description: "Default security group",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    },
  ]

  const mockOpenstackSession = {
    service: vi.fn().mockImplementation((serviceName: string) => {
      if (serviceName !== "network" || noNetworkService) {
        return null
      }

      return {
        get: vi.fn().mockImplementation((url: string) => {
          if (mockError) {
            return Promise.reject(new Error("Network error"))
          }

          // Handle list endpoint
          if (url.includes("security-groups") && !url.match(/security-groups\/[^?]+$/)) {
            return Promise.resolve({
              ok: true,
              json: vi.fn().mockResolvedValue({
                security_groups: mockSecurityGroups || defaultSecurityGroups,
              }),
            })
          }

          // Handle getById endpoint
          if (mockSecurityGroup) {
            return Promise.resolve({
              ok: true,
              json: vi.fn().mockResolvedValue({
                security_group: mockSecurityGroup,
              }),
            })
          }

          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              security_group: defaultSecurityGroups[0],
            }),
          })
        }),
      }
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: mockOpenstackSession,
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    // Mock rescopeSession to return the rescoped session for projectScopedProcedure
    rescopeSession: vi.fn().mockImplementation(async () => {
      if (rescopeFails) {
        return null
      }
      return mockOpenstackSession
    }),
  } as unknown as AuroraPortalContext
}

const createCaller = createCallerFactory(
  auroraRouter({
    securityGroup: securityGroupRouter,
  })
)

describe("securityGroupRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of security groups", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.list({
      project_id: "proj-1", // Required by projectScopedProcedure (OpenStack uses snake_case)
      sort_key: "name",
      sort_dir: "asc",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)

    const sg: SecurityGroup = result[0]
    expect(sg.id).toBe("sg-1")
    expect(sg.name).toBe("default")
    expect(sg.project_id).toBe("proj-1")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.list({
        project_id: "proj-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.list({
        project_id: "proj-1",
      })
    ).rejects.toThrowError(TRPCError)

    try {
      await caller.securityGroup.list({ project_id: "proj-1" })
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        expect(error.message).toBe("Network service is not available")
      } else {
        throw error
      }
    }
  })

  describe("Search filtering", () => {
    const mockSecurityGroups: SecurityGroup[] = [
      {
        id: "sg-1",
        name: "web-server",
        description: "Security group for web servers",
        project_id: "proj-1",
        shared: false,
        stateful: true,
        security_group_rules: [],
      },
      {
        id: "sg-2",
        name: "database",
        description: "Security group for database servers",
        project_id: "proj-1",
        shared: false,
        stateful: true,
        security_group_rules: [],
      },
      {
        id: "sg-3",
        name: "api-gateway",
        description: "Gateway for API services",
        project_id: "proj-1",
        shared: false,
        stateful: true,
        security_group_rules: [],
      },
    ]

    it("returns all security groups when no searchTerm is provided", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({ project_id: "proj-1" })

      expect(result.length).toBe(3)
    })

    it("filters by name (case-insensitive)", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "WEB",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("filters by description", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "gateway",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })

    it("filters by id", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "sg-1",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("returns multiple matches", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "server",
      })

      expect(result.length).toBe(2)
      const names = result.map((sg) => sg.name).sort()
      expect(names).toEqual(["database", "web-server"])
    })

    it("returns empty array when no matches", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "nonexistent",
      })

      expect(result.length).toBe(0)
    })

    it("trims whitespace from searchTerm", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        searchTerm: "  web  ",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })
  })

  describe("Dual-fetch mode (own + shared)", () => {
    const createMockContextForDualFetch = (opts?: { ownGroups?: SecurityGroup[]; sharedGroups?: SecurityGroup[] }) => {
      const { ownGroups = [], sharedGroups = [] } = opts || {}

      let callCount = 0

      const mockOpenstackSession = {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network") {
            return null
          }

          return {
            get: vi.fn().mockImplementation(() => {
              // First call: shared=false (own groups)
              // Second call: shared=true (shared groups)
              const isFirstCall = callCount === 0
              callCount++

              const groups = isFirstCall ? ownGroups : sharedGroups

              return Promise.resolve({
                ok: true,
                json: vi.fn().mockResolvedValue({
                  security_groups: groups,
                }),
              })
            }),
          }
        }),
      }

      return {
        validateSession: vi.fn().mockReturnValue(true),
        openstack: mockOpenstackSession,
        createSession: vi.fn(),
        terminateSession: vi.fn(),
        rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      } as unknown as AuroraPortalContext
    }

    it("merges and deduplicates own and shared security groups", async () => {
      const ownGroups: SecurityGroup[] = [
        {
          id: "sg-1",
          name: "own-group-1",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
        {
          id: "sg-2",
          name: "own-group-2",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const sharedGroups: SecurityGroup[] = [
        {
          id: "sg-3",
          name: "shared-group-1",
          project_id: "proj-other",
          shared: true,
          stateful: true,
          security_group_rules: [],
        },
        {
          id: "sg-1", // Duplicate - should be deduplicated
          name: "own-group-1",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const ctx = createMockContextForDualFetch({ ownGroups, sharedGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        // shared is undefined - triggers dual-fetch mode
      })

      expect(result.length).toBe(3) // sg-1, sg-2, sg-3 (sg-1 duplicate removed)
      const ids = result.map((sg) => sg.id).sort()
      expect(ids).toEqual(["sg-1", "sg-2", "sg-3"])
    })

    it("applies global sorting after merging", async () => {
      const ownGroups: SecurityGroup[] = [
        {
          id: "sg-3",
          name: "zebra",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
        {
          id: "sg-1",
          name: "alpha",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const sharedGroups: SecurityGroup[] = [
        {
          id: "sg-2",
          name: "beta",
          project_id: "proj-other",
          shared: true,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const ctx = createMockContextForDualFetch({ ownGroups, sharedGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        sort_key: "name",
        sort_dir: "asc",
      })

      expect(result.length).toBe(3)
      expect(result[0].name).toBe("alpha")
      expect(result[1].name).toBe("beta")
      expect(result[2].name).toBe("zebra")
    })

    it("applies global sorting in descending order", async () => {
      const ownGroups: SecurityGroup[] = [
        {
          id: "sg-1",
          name: "alpha",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const sharedGroups: SecurityGroup[] = [
        {
          id: "sg-2",
          name: "beta",
          project_id: "proj-other",
          shared: true,
          stateful: true,
          security_group_rules: [],
        },
        {
          id: "sg-3",
          name: "gamma",
          project_id: "proj-other",
          shared: true,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const ctx = createMockContextForDualFetch({ ownGroups, sharedGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        project_id: "proj-1",
        sort_key: "name",
        sort_dir: "desc",
      })

      expect(result.length).toBe(3)
      expect(result[0].name).toBe("gamma")
      expect(result[1].name).toBe("beta")
      expect(result[2].name).toBe("alpha")
    })
  })
})
describe("securityGroupRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a security group by id", async () => {
    const mockSecurityGroup: SecurityGroup = {
      id: "sg-123",
      name: "web-server",
      description: "Security group for web servers",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [
        {
          id: "rule-1",
          direction: "ingress",
          protocol: "tcp",
          port_range_min: 80,
          port_range_max: 80,
          remote_ip_prefix: "0.0.0.0/0",
          security_group_id: "sg-123",
        },
      ],
    }

    const ctx = createMockContext({ mockSecurityGroup })
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.getById({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
    })

    expect(result.id).toBe("sg-123")
    expect(result.name).toBe("web-server")
    expect(result.security_group_rules).toBeDefined()
    expect(result.security_group_rules?.length).toBe(1)
    expect(result.security_group_rules?.[0].port_range_min).toBe(80)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.getById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.getById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrowError(TRPCError)

    try {
      await caller.securityGroup.getById({ project_id: TEST_PROJECT_ID, securityGroupId: "sg-123" })
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        expect(error.message).toBe("Network service is not available")
      } else {
        throw error
      }
    }
  })
})

describe("securityGroupRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockContextForCreate = (opts?: {
    noNetworkService?: boolean
    invalidSession?: boolean
    responseStatus?: number
  }) => {
    const { noNetworkService = false, invalidSession = false, responseStatus = 201 } = opts || {}

    const mockCreatedSecurityGroup: SecurityGroup = {
      id: "sg-new",
      name: "test-sg",
      description: "Test security group",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    }

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      openstack: {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network" || noNetworkService) {
            return null
          }

          return {
            post: vi.fn().mockImplementation(() => {
              if (responseStatus === 201) {
                return Promise.resolve({
                  ok: true,
                  status: responseStatus,
                  json: vi.fn().mockResolvedValue({
                    security_group: mockCreatedSecurityGroup,
                  }),
                })
              }

              // Mock error responses
              return Promise.resolve({
                ok: false,
                status: responseStatus,
                statusText: responseStatus === 413 ? "Quota exceeded" : "Error",
              })
            }),
          }
        }),
      },
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn(),
    } as unknown as AuroraPortalContext
  }

  it("creates a security group successfully", async () => {
    const ctx = createMockContextForCreate()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.create({
      project_id: TEST_PROJECT_ID,
      name: "test-sg",
      description: "Test security group",
      stateful: true,
    })

    expect(result.id).toBe("sg-new")
    expect(result.name).toBe("test-sg")
    expect(result.description).toBe("Test security group")
  })

  it("creates a security group without optional fields", async () => {
    const ctx = createMockContextForCreate()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.create({
      project_id: TEST_PROJECT_ID,
      name: "minimal-sg",
    })

    expect(result.id).toBe("sg-new")
    expect(result.name).toBe("test-sg")
  })

  it("throws error when quota is exceeded", async () => {
    const ctx = createMockContextForCreate({ responseStatus: 413 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.create({
        project_id: TEST_PROJECT_ID,
        name: "test-sg",
      })
    ).rejects.toThrow(/Quota exceeded/)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContextForCreate({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.create({
        project_id: TEST_PROJECT_ID,
        name: "test-sg",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContextForCreate({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.create({
        project_id: TEST_PROJECT_ID,
        name: "test-sg",
      })
    ).rejects.toThrow("Network service is not available")
  })
})

describe("securityGroupRouter.deleteById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockContextForDelete = (opts?: {
    noNetworkService?: boolean
    invalidSession?: boolean
    responseStatus?: number
  }) => {
    const { noNetworkService = false, invalidSession = false, responseStatus = 204 } = opts || {}

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      openstack: {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network" || noNetworkService) {
            return null
          }

          return {
            del: vi.fn().mockImplementation(() => {
              if (responseStatus === 204) {
                return Promise.resolve({
                  ok: true,
                  status: responseStatus,
                })
              }

              // Mock error responses
              return Promise.resolve({
                ok: false,
                status: responseStatus,
                statusText: responseStatus === 409 ? "Conflict" : responseStatus === 404 ? "Not Found" : "Error",
              })
            }),
          }
        }),
      },
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn(),
    } as unknown as AuroraPortalContext
  }

  it("deletes a security group successfully", async () => {
    const ctx = createMockContextForDelete()
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).resolves.not.toThrow()
  })

  it("throws error when security group is in use", async () => {
    const ctx = createMockContextForDelete({ responseStatus: 409 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow(/in use/)
  })

  it("throws NOT_FOUND when security group does not exist", async () => {
    const ctx = createMockContextForDelete({ responseStatus: 404 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-nonexistent",
      })
    ).rejects.toThrow("Security group not found")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContextForDelete({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContextForDelete({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow("Network service is not available")
  })
})

describe("securityGroupRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockContextForUpdate = (opts?: {
    noNetworkService?: boolean
    invalidSession?: boolean
    responseStatus?: number
  }) => {
    const { noNetworkService = false, invalidSession = false, responseStatus = 200 } = opts || {}

    const mockUpdatedSecurityGroup: SecurityGroup = {
      id: "sg-123",
      name: "updated-sg",
      description: "Updated security group",
      project_id: "proj-1",
      shared: false,
      stateful: true,
      security_group_rules: [],
    }

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      openstack: {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network" || noNetworkService) {
            return null
          }

          return {
            put: vi.fn().mockImplementation(() => {
              if (responseStatus === 200) {
                return Promise.resolve({
                  ok: true,
                  status: responseStatus,
                  json: vi.fn().mockResolvedValue({
                    security_group: mockUpdatedSecurityGroup,
                  }),
                })
              }

              // Mock error responses
              return Promise.resolve({
                ok: false,
                status: responseStatus,
                statusText:
                  responseStatus === 404
                    ? "Not Found"
                    : responseStatus === 409
                      ? "Cannot update stateful attribute while in use"
                      : "Error",
              })
            }),
          }
        }),
      },
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn(),
    } as unknown as AuroraPortalContext
  }

  it("updates a security group successfully", async () => {
    const ctx = createMockContextForUpdate()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.update({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
      name: "updated-sg",
      description: "Updated security group",
    })

    expect(result.id).toBe("sg-123")
    expect(result.name).toBe("updated-sg")
    expect(result.description).toBe("Updated security group")
  })

  it("updates a security group with partial data", async () => {
    const ctx = createMockContextForUpdate()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.update({
      project_id: TEST_PROJECT_ID,
      securityGroupId: "sg-123",
      name: "updated-name-only",
    })

    expect(result.id).toBe("sg-123")
    expect(result.name).toBe("updated-sg")
  })

  it("throws NOT_FOUND when security group does not exist", async () => {
    const ctx = createMockContextForUpdate({ responseStatus: 404 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.update({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-nonexistent",
        name: "new-name",
      })
    ).rejects.toThrow("Security group not found")
  })

  it("throws CONFLICT when updating stateful on in-use security group", async () => {
    const ctx = createMockContextForUpdate({ responseStatus: 409 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.update({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        stateful: false,
      })
    ).rejects.toThrow(/stateful/)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContextForUpdate({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.update({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        name: "new-name",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContextForUpdate({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.update({
        project_id: TEST_PROJECT_ID,
        securityGroupId: "sg-123",
        name: "new-name",
      })
    ).rejects.toThrow("Network service is not available")
  })
})
