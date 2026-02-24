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
}) => {
  const { noNetworkService = false, invalidSession = false, mockSecurityGroups } = opts || {}

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
          get: vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
              security_groups: mockSecurityGroups || defaultSecurityGroups,
            }),
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

  it("returns a list of security groups on success", async () => {
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

  describe("BFF-side search filtering", () => {
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
      {
        id: "sg-4",
        name: "default",
        description: "Default security group",
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

      expect(result.length).toBe(4)
    })

    it("filters security groups by name (case-insensitive)", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "web",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("filters security groups by description (case-insensitive)", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "gateway",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("api-gateway")
    })

    it("filters security groups by id (case-insensitive)", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "sg-1",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("returns multiple matches when searchTerm matches multiple groups", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "server",
      })

      expect(result.length).toBe(2)
      const names = result.map((sg) => sg.name).sort()
      expect(names).toEqual(["database", "web-server"])
    })

    it("handles case-insensitive search correctly", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "WEB",
      })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe("web-server")
    })

    it("returns empty array when searchTerm matches no groups", async () => {
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

    it("returns all results when searchTerm is empty string", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "",
      })

      expect(result.length).toBe(4)
    })

    it("returns all results when searchTerm is only whitespace", async () => {
      const ctx = createMockContext({ mockSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "   ",
      })

      expect(result.length).toBe(4)
    })

    it("applies searchTerm filter on top of OpenStack filters", async () => {
      // This test demonstrates that searchTerm filtering happens in BFF layer
      // after OpenStack has already filtered by other parameters
      const mixedSecurityGroups: SecurityGroup[] = [
        {
          id: "sg-1",
          name: "web-server",
          description: "Security group for web servers",
          project_id: "proj-1",
          shared: true,
          stateful: true,
          security_group_rules: [],
        },
        {
          id: "sg-2",
          name: "web-cache",
          description: "Cache for web content",
          project_id: "proj-1",
          shared: false,
          stateful: true,
          security_group_rules: [],
        },
      ]

      const ctx = createMockContext({ mockSecurityGroups: mixedSecurityGroups })
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({
        searchTerm: "web",
      })

      // Both security groups match "web" in their name
      expect(result.length).toBe(2)
      const names = result.map((sg) => sg.name).sort()
      expect(names).toEqual(["web-cache", "web-server"])
    })
  })
})
