import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { securityGroupRouter } from "./securityGroupRouter"
import { SecurityGroup } from "../types/securityGroup"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  mockSecurityGroups?: SecurityGroup[]
  mockSecurityGroup?: SecurityGroup
  mockError?: boolean
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    mockSecurityGroups,
    mockSecurityGroup,
    mockError,
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

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: {
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
                json: vi.fn().mockResolvedValue({
                  security_groups: mockSecurityGroups || defaultSecurityGroups,
                }),
              })
            }

            // Handle getById endpoint
            if (mockSecurityGroup) {
              return Promise.resolve({
                json: vi.fn().mockResolvedValue({
                  security_group: mockSecurityGroup,
                }),
              })
            }

            return Promise.resolve({
              json: vi.fn().mockResolvedValue({
                security_group: defaultSecurityGroups[0],
              }),
            })
          }),
        }
      }),
    },
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn(),
    getMultipartData: vi.fn(),
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
      limit: 10,
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
        limit: 5,
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
        limit: 5,
      })
    ).rejects.toThrowError(TRPCError)

    try {
      await caller.securityGroup.list({ limit: 5 })
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

      const result = await caller.securityGroup.list({})

      expect(result.length).toBe(3)
    })

    it("filters by name (case-insensitive)", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "WEB",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("filters by description", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "gateway",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })

    it("filters by id", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "sg-1",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("returns multiple matches", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
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
        searchTerm: "nonexistent",
      })

      expect(result.length).toBe(0)
    })

    it("trims whitespace from searchTerm", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "  web  ",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
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
        securityGroupId: "sg-123",
      })
    ).rejects.toThrowError(TRPCError)

    try {
      await caller.securityGroup.getById({ securityGroupId: "sg-123" })
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
      getMultipartData: vi.fn(),
    } as unknown as AuroraPortalContext
  }

  it("creates a security group successfully", async () => {
    const ctx = createMockContextForCreate()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.create({
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
        name: "test-sg",
      })
    ).rejects.toThrow(/Quota exceeded/)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContextForCreate({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.create({
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
      getMultipartData: vi.fn(),
    } as unknown as AuroraPortalContext
  }

  it("deletes a security group successfully", async () => {
    const ctx = createMockContextForDelete()
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        securityGroupId: "sg-123",
      })
    ).resolves.not.toThrow()
  })

  it("throws error when security group is in use", async () => {
    const ctx = createMockContextForDelete({ responseStatus: 409 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow(/in use/)
  })

  it("throws NOT_FOUND when security group does not exist", async () => {
    const ctx = createMockContextForDelete({ responseStatus: 404 })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
        securityGroupId: "sg-nonexistent",
      })
    ).rejects.toThrow("Security group not found")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContextForDelete({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.deleteById({
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
        securityGroupId: "sg-123",
      })
    ).rejects.toThrow("Network service is not available")
  })
})
