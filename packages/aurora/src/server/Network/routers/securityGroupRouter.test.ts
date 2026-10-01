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
        post: vi.fn().mockImplementation(() => {
          if (mockError) {
            return Promise.reject(new Error("Network error"))
          }
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              security_group: mockSecurityGroup || defaultSecurityGroups[0],
            }),
          })
        }),
        put: vi.fn().mockImplementation(() => {
          if (mockError) {
            return Promise.reject(new Error("Network error"))
          }
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              security_group: mockSecurityGroup || defaultSecurityGroups[0],
            }),
          })
        }),
        del: vi.fn().mockImplementation(() => {
          if (mockError) {
            return Promise.reject(new Error("Network error"))
          }
          return Promise.resolve({
            ok: true,
            status: 204,
          })
        }),
      }
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    identityEndpoint: "http://identity.example.com/",
    imageMetadataExcludedProperties: [],
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
        identityEndpoint: "http://identity.example.com/",
        imageMetadataExcludedProperties: [],
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

  describe("Explicit shared filter (admin token)", () => {
    type FixtureGroup = SecurityGroup & { sharedWith: string[] }

    const makeGroup = (
      id: string,
      name: string,
      project_id: string,
      extra: Partial<FixtureGroup> = {}
    ): FixtureGroup => ({
      id,
      name,
      project_id,
      shared: false,
      stateful: true,
      security_group_rules: [],
      sharedWith: [],
      ...extra,
    })

    const adminFixture: FixtureGroup[] = [
      makeGroup("sg-default-1", "default", "proj-1"),
      makeGroup("sg-default-2", "default", "proj-2"),
      makeGroup("sg-default-3", "default", "proj-3"),
      makeGroup("sg-default-4", "default", "proj-4"),
      makeGroup("sg-manila", "manila-service", "proj-1"),
      makeGroup("sg-shared-wide", "shared-wide", "proj-2", { sharedWith: ["*"] }),
      makeGroup("sg-own-wide", "own-wide", "proj-1", { sharedWith: ["*"] }),
      makeGroup("sg-shared-to-proj1", "shared-to-proj1", "proj-3", { sharedWith: ["proj-1"] }),
      makeGroup("sg-shared-to-proj9", "shared-to-proj9", "proj-4", { sharedWith: ["proj-9"] }),
      makeGroup("sg-stateless-own", "stateless-own", "proj-1", { stateful: false }),
    ]

    /**
     * Emulates the observed Neutron behaviour for an admin token: without a project_id filter every
     * project's groups are returned; `shared` is evaluated relative to the requesting project.
     */
    const createNeutronListMock = (opts: {
      requestingProjectId: string
      groups: FixtureGroup[]
      /** Models Neutron returning the project's own groups regardless of `shared` when filtered by project_id */
      projectFilterIgnoresShared?: boolean
    }) => {
      const { requestingProjectId, groups, projectFilterIgnoresShared = false } = opts
      const requestedUrls: string[] = []

      const isSharedWithRequester = (g: FixtureGroup) =>
        g.sharedWith.includes("*") || g.sharedWith.includes(requestingProjectId)

      const mockOpenstackSession = {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network") {
            return null
          }
          return {
            get: vi.fn().mockImplementation((url: string) => {
              requestedUrls.push(url)
              const params = new URL(url, "http://x").searchParams
              const projectFilter = params.get("project_id")
              const sharedFilter = params.get("shared")

              let matches = groups
              if (projectFilter) {
                matches = matches.filter((g) => g.project_id === projectFilter)
              }
              if (projectFilter && projectFilterIgnoresShared) {
                // own groups are returned unfiltered by `shared`
              } else if (sharedFilter === "true") {
                matches = matches.filter(isSharedWithRequester)
              } else if (sharedFilter === "false") {
                matches = matches.filter((g) => !isSharedWithRequester(g))
              }

              const security_groups = matches.map(({ sharedWith: _sharedWith, ...sg }) => ({
                ...sg,
                shared: isSharedWithRequester({ ...sg, sharedWith: _sharedWith }),
              }))
              return Promise.resolve({
                ok: true,
                json: vi.fn().mockResolvedValue({ security_groups }),
              })
            }),
          }
        }),
      }

      const ctx = {
        validateSession: vi.fn().mockReturnValue(true),
        identityEndpoint: "http://identity.example.com/",
        imageMetadataExcludedProperties: [],
        openstack: mockOpenstackSession,
        createSession: vi.fn(),
        terminateSession: vi.fn(),
        rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
      } as unknown as AuroraPortalContext

      return { ctx, requestedUrls }
    }

    const setup = (groups: FixtureGroup[] = adminFixture, projectFilterIgnoresShared = false) =>
      createNeutronListMock({ requestingProjectId: "proj-1", groups, projectFilterIgnoresShared })

    const queryOf = (url: string) => new URL(url, "http://x").searchParams
    const ids = (list: SecurityGroup[]) => list.map((g) => g.id)

    it("shared=false sends project_id and returns only own groups", async () => {
      const { ctx, requestedUrls } = setup()
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({ project_id: "proj-1", shared: false })

      expect(requestedUrls).toHaveLength(1)
      const query = queryOf(requestedUrls[0])
      expect(query.get("project_id")).toBe("proj-1")
      expect(query.get("shared")).toBe("false")
      expect(ids(result).sort()).toEqual(["sg-default-1", "sg-manila", "sg-stateless-own"])
      expect(result.filter((g) => g.name === "default")).toHaveLength(1)
    })

    it("shared=true sends a single shared=true request", async () => {
      const { ctx, requestedUrls } = setup()
      const caller = createCaller(ctx)

      const result = await caller.securityGroup.list({ project_id: "proj-1", shared: true })

      expect(requestedUrls).toHaveLength(1)
      const query = queryOf(requestedUrls[0])
      expect(query.get("shared")).toBe("true")
      expect(query.has("project_id")).toBe(false)
      expect(ids(result).sort()).toEqual(["sg-own-wide", "sg-shared-to-proj1", "sg-shared-wide"])
    })

    it("lists an own group that is also shared once, in the shared partition", async () => {
      const { ctx } = setup()
      const caller = createCaller(ctx)

      const all = ids(await caller.securityGroup.list({ project_id: "proj-1" }))
      const yes = ids(await caller.securityGroup.list({ project_id: "proj-1", shared: true }))
      const no = ids(await caller.securityGroup.list({ project_id: "proj-1", shared: false }))

      expect(all.filter((id) => id === "sg-own-wide")).toHaveLength(1)
      expect(yes).toContain("sg-own-wide")
      expect(no).not.toContain("sg-own-wide")
    })

    it("deduplicates a group returned by both the own and the shared request", async () => {
      const { ctx } = setup(adminFixture, true)

      const result = await createCaller(ctx).securityGroup.list({ project_id: "proj-1" })

      expect(ids(result).filter((id) => id === "sg-own-wide")).toHaveLength(1)
      expect(new Set(ids(result)).size).toBe(result.length)
    })

    it("filtered results are subsets of the unfiltered list", async () => {
      const sharedValues = [undefined, true, false]
      const statefulValues = [undefined, true, false]

      const run = async (shared?: boolean, stateful?: boolean) => {
        const { ctx } = setup()
        const result = await createCaller(ctx).securityGroup.list({ project_id: "proj-1", shared, stateful })
        return ids(result)
      }

      for (const stateful of statefulValues) {
        const all = new Set(await run(undefined, stateful))
        const yes = await run(true, stateful)
        const no = await run(false, stateful)

        for (const id of [...yes, ...no]) {
          expect(all.has(id)).toBe(true)
        }
        expect(yes.filter((id) => no.includes(id))).toEqual([])
        expect(new Set([...yes, ...no])).toEqual(all)
      }

      for (const shared of sharedValues) {
        const all = new Set(await run(shared, undefined))
        for (const stateful of [true, false]) {
          for (const id of await run(shared, stateful)) {
            expect(all.has(id)).toBe(true)
          }
        }
      }
    })

    it("explicit filter sorts in the BFF", async () => {
      const reversed = [...adminFixture].reverse()

      const asc = setup(reversed)
      const ascResult = await createCaller(asc.ctx).securityGroup.list({
        project_id: "proj-1",
        shared: false,
        sort_key: "name",
        sort_dir: "asc",
      })
      expect(ascResult.map((g) => g.name)).toEqual(["default", "manila-service", "stateless-own"])

      const desc = setup(reversed)
      const descResult = await createCaller(desc.ctx).securityGroup.list({
        project_id: "proj-1",
        shared: false,
        sort_key: "name",
        sort_dir: "desc",
      })
      expect(descResult.map((g) => g.name)).toEqual(["stateless-own", "manila-service", "default"])

      for (const url of [...asc.requestedUrls, ...desc.requestedUrls]) {
        expect(url).not.toContain("sort_key")
        expect(url).not.toContain("sort_dir")
      }
    })

    it("explicit filter combines with stateful and searchTerm", async () => {
      const statefulCase = setup()
      const stateless = await createCaller(statefulCase.ctx).securityGroup.list({
        project_id: "proj-1",
        shared: false,
        stateful: false,
      })
      expect(ids(stateless)).toEqual(["sg-stateless-own"])

      const searchCase = setup()
      const searched = await createCaller(searchCase.ctx).securityGroup.list({
        project_id: "proj-1",
        shared: false,
        searchTerm: "MANILA",
      })
      expect(ids(searched)).toEqual(["sg-manila"])
    })

    it("never forwards a caller-supplied tenant_id to Neutron", async () => {
      const { ctx, requestedUrls } = setup()
      const caller = createCaller(ctx)

      // tenant_id is a Neutron alias of project_id; forwarding it could widen the own-side scope
      const input = { project_id: "proj-1", tenant_id: "proj-2" } as unknown as Parameters<
        typeof caller.securityGroup.list
      >[0]
      for (const shared of [undefined, true, false]) {
        await caller.securityGroup.list({ ...input, shared })
      }

      expect(requestedUrls).toHaveLength(4)
      for (const url of requestedUrls) {
        expect(queryOf(url).has("tenant_id")).toBe(false)
      }
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

    const mockOpenstackSession = {
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
    }

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      identityEndpoint: "http://identity.example.com/",
      imageMetadataExcludedProperties: [],
      openstack: mockOpenstackSession,
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
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

    const mockOpenstackSession = {
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
    }

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      identityEndpoint: "http://identity.example.com/",
      imageMetadataExcludedProperties: [],
      openstack: mockOpenstackSession,
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
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

    const mockOpenstackSession = {
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
    }

    return {
      validateSession: vi.fn().mockReturnValue(!invalidSession),
      identityEndpoint: "http://identity.example.com/",
      imageMetadataExcludedProperties: [],
      openstack: mockOpenstackSession,
      createSession: vi.fn(),
      terminateSession: vi.fn(),
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
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
