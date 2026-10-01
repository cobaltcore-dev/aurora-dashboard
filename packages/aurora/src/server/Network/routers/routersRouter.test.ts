import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { routersRouter } from "./routersRouter"
import { AuroraPortalContext } from "@/server/context"

const TEST_PROJECT_ID = "proj-1"

const defaultRouters = [
  {
    id: "router-1",
    name: "edge-router",
    description: "Main edge router",
    status: "ACTIVE",
    admin_state_up: true,
    project_id: TEST_PROJECT_ID,
    external_gateway_info: {
      network_id: "ext-net-1",
      enable_snat: true,
      external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "172.24.4.10" }],
    },
    routes: [],
    revision_number: 1,
  },
  {
    id: "router-2",
    name: "internal-router",
    description: "Internal only",
    status: "DOWN",
    admin_state_up: false,
    project_id: TEST_PROJECT_ID,
    external_gateway_info: null,
    routes: [],
    revision_number: 2,
  },
]

const defaultPorts = [
  {
    id: "port-if-1",
    name: "",
    network_id: "net-1",
    device_owner: "network:router_interface",
    status: "ACTIVE",
    admin_state_up: true,
    mac_address: "fa:16:3e:00:00:01",
    fixed_ips: [{ subnet_id: "subnet-1", ip_address: "10.0.0.1" }],
  },
  {
    id: "port-gw",
    name: "",
    network_id: "ext-net-1",
    device_owner: "network:router_gateway",
    status: "ACTIVE",
    fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "172.24.4.10" }],
  },
  {
    id: "port-snat",
    name: "",
    network_id: "net-1",
    device_owner: "network:router_centralized_snat",
    status: "ACTIVE",
    fixed_ips: [{ subnet_id: "subnet-1", ip_address: "10.0.0.2" }],
  },
]

const defaultSubnets = [
  { id: "subnet-1", name: "private-subnet", cidr: "10.0.0.0/24" },
  { id: "ext-subnet-1", name: "FloatingIP-sap-01", cidr: "172.24.4.0/24" },
]

const defaultNetworks = [{ id: "ext-net-1", name: "FloatingIP-external-01" }]

const defaultExtensions = [{ alias: "dvr" }, { alias: "extraroute" }, { alias: "l3-ha" }]

const defaultInterfaceInfo = {
  id: "router-1",
  subnet_id: "subnet-1",
  subnet_ids: ["subnet-1"],
  port_id: "port-if-1",
  network_id: "net-1",
  project_id: TEST_PROJECT_ID,
}

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  httpStatus?: number
  statusText?: string
  subnetsFail?: boolean
  networksFail?: boolean
  mockRouters?: unknown[]
  mockPorts?: unknown[]
  mockSubnets?: unknown[]
  mockExtensions?: unknown[]
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    httpStatus = 200,
    statusText,
    subnetsFail = false,
    networksFail = false,
    mockRouters = defaultRouters,
    mockPorts = defaultPorts,
    mockSubnets = defaultSubnets,
    mockExtensions = defaultExtensions,
  } = opts || {}

  const ok = httpStatus >= 200 && httpStatus < 300
  const response = (body: unknown, overrides: { ok?: boolean; status?: number } = {}) => ({
    ok: overrides.ok ?? ok,
    status: overrides.status ?? httpStatus,
    statusText: statusText ?? (ok ? "OK" : "Error"),
    json: vi.fn().mockResolvedValue(parseError ? { invalid: "data" } : body),
  })

  const networkGetMock = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("v2.0/subnets")) {
      return Promise.resolve(
        subnetsFail ? response({}, { ok: false, status: 500 }) : response({ subnets: mockSubnets }, { ok: true })
      )
    }
    if (url.startsWith("v2.0/networks")) {
      return Promise.resolve(
        networksFail ? response({}, { ok: false, status: 403 }) : response({ networks: defaultNetworks }, { ok: true })
      )
    }
    if (url.startsWith("v2.0/ports")) return Promise.resolve(response({ ports: mockPorts }))
    if (url.startsWith("v2.0/extensions")) return Promise.resolve(response({ extensions: mockExtensions }))
    if (url.startsWith("v2.0/routers/")) return Promise.resolve(response({ router: mockRouters[0] }))
    return Promise.resolve(response({ routers: mockRouters }))
  })

  const networkPostMock = vi.fn().mockImplementation(() => Promise.resolve(response({ router: mockRouters[0] })))

  const networkPutMock = vi.fn().mockImplementation((url: string) => {
    const isInterfaceAction = url.endsWith("/add_router_interface") || url.endsWith("/remove_router_interface")
    return Promise.resolve(response(isInterfaceAction ? defaultInterfaceInfo : { router: mockRouters[0] }))
  })

  const networkDelMock = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ ok, status: httpStatus, statusText: statusText ?? (ok ? "No Content" : "Error") })
    )

  const mockOpenstackSession = {
    getToken: vi.fn().mockReturnValue({
      authToken: "mock-auth-token",
      tokenData: { project: { id: TEST_PROJECT_ID, name: "test-project" }, user: { id: "user-1", name: "test-user" } },
    }),
    service: vi.fn().mockImplementation((serviceName: string) => {
      if (serviceName === "network" && !noNetworkService) {
        return { get: networkGetMock, post: networkPostMock, put: networkPutMock, del: networkDelMock }
      }
      return null
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    identityEndpoint: "http://identity.example.com/",
    imageMetadataExcludedProperties: [],
    openstack: mockOpenstackSession,
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn().mockResolvedValue(!invalidSession ? mockOpenstackSession : null),
    getMultipartData: vi.fn(),
    __networkGetMock: networkGetMock,
    __networkPostMock: networkPostMock,
    __networkPutMock: networkPutMock,
    __networkDelMock: networkDelMock,
  } as unknown as AuroraPortalContext & {
    __networkGetMock: typeof networkGetMock
    __networkPostMock: typeof networkPostMock
    __networkPutMock: typeof networkPutMock
    __networkDelMock: typeof networkDelMock
  }
}

const createCaller = createCallerFactory(
  auroraRouter({
    routers: routersRouter,
  })
)

const splitUrl = (url: string) => {
  const [path, query] = url.split("?")
  return { path, params: new URLSearchParams(query) }
}

describe("routersRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of routers on success", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.routers.list({ project_id: TEST_PROJECT_ID })

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("router-1")
    expect(result[0].external_gateway_info?.network_id).toBe("ext-net-1")
    expect(result[1].id).toBe("router-2")
    expect(result[1].external_gateway_info).toBeNull()
  })

  it("returns an empty array when no routers exist", async () => {
    const caller = createCaller(createMockContext({ mockRouters: [] }))

    expect(await caller.routers.list({ project_id: TEST_PROJECT_ID })).toEqual([])
  })

  it("forwards Neutron filters and maps tag keys, but not BFF-side params", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.list({
      project_id: TEST_PROJECT_ID,
      name: "edge",
      admin_state_up: true,
      sort_key: "name",
      sort_dir: "desc",
      tags_any: "prod",
      not_tags: "old",
      searchTerm: "edge",
      status: "ACTIVE",
      has_gateway: true,
    })

    const { path, params } = splitUrl(ctx.__networkGetMock.mock.calls[0][0] as string)
    expect(path).toBe("v2.0/routers")
    expect(params.get("project_id")).toBe(TEST_PROJECT_ID)
    expect(params.get("name")).toBe("edge")
    expect(params.get("admin_state_up")).toBe("true")
    expect(params.get("sort_key")).toBe("name")
    expect(params.get("sort_dir")).toBe("desc")
    expect(params.get("tags-any")).toBe("prod")
    expect(params.get("not-tags")).toBe("old")
    expect(params.has("tags_any")).toBe(false)
    expect(params.has("searchTerm")).toBe(false)
    expect(params.has("status")).toBe(false)
    expect(params.has("has_gateway")).toBe(false)
  })

  describe("external gateway name enrichment", () => {
    it("adds external network and subnet names to the gateway", async () => {
      const caller = createCaller(createMockContext())

      const [router] = await caller.routers.list({ project_id: TEST_PROJECT_ID })

      expect(router.external_gateway_info?.network_name).toBe("FloatingIP-external-01")
      expect(router.external_gateway_info?.external_fixed_ips?.[0]).toEqual({
        subnet_id: "ext-subnet-1",
        ip_address: "172.24.4.10",
        subnet_name: "FloatingIP-sap-01",
      })
    })

    it("resolves names with one batched networks request and one batched subnets request", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.routers.list({ project_id: TEST_PROJECT_ID })

      const urls: string[] = ctx.__networkGetMock.mock.calls.map((call: unknown[]) => call[0] as string)
      expect(urls).toHaveLength(3)

      const networks = splitUrl(urls.find((url) => url.startsWith("v2.0/networks"))!)
      expect(networks.params.getAll("id")).toEqual(["ext-net-1"])
      expect(networks.params.getAll("fields")).toEqual(["id", "name"])

      const subnets = splitUrl(urls.find((url) => url.startsWith("v2.0/subnets"))!)
      expect(subnets.params.getAll("id")).toEqual(["ext-subnet-1"])
      expect(subnets.params.getAll("fields")).toEqual(["id", "name"])
    })

    it("only resolves names for routers left after BFF-side filtering", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.routers.list({ project_id: TEST_PROJECT_ID, has_gateway: false })

      expect(result.map((r) => r.id)).toEqual(["router-2"])
      expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    })

    it("still returns routers with IDs only when name lookups fail", async () => {
      const caller = createCaller(createMockContext({ networksFail: true, subnetsFail: true }))

      const [router] = await caller.routers.list({ project_id: TEST_PROJECT_ID })

      expect(router.external_gateway_info?.network_id).toBe("ext-net-1")
      expect(router.external_gateway_info?.network_name).toBeUndefined()
      expect(router.external_gateway_info?.external_fixed_ips?.[0].subnet_name).toBeUndefined()
    })

    it("keeps routers without gateway unchanged", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.routers.list({ project_id: TEST_PROJECT_ID })

      expect(result[1].external_gateway_info).toBeNull()
    })
  })

  describe("BFF-side filtering", () => {
    it("filters by status", async () => {
      const caller = createCaller(createMockContext())

      const result = await caller.routers.list({ project_id: TEST_PROJECT_ID, status: "DOWN" })

      expect(result.map((r) => r.id)).toEqual(["router-2"])
    })

    it("filters by has_gateway", async () => {
      const caller = createCaller(createMockContext())

      expect((await caller.routers.list({ project_id: TEST_PROJECT_ID, has_gateway: true })).map((r) => r.id)).toEqual([
        "router-1",
      ])
      expect((await caller.routers.list({ project_id: TEST_PROJECT_ID, has_gateway: false })).map((r) => r.id)).toEqual(
        ["router-2"]
      )
    })

    it("filters by searchTerm on name, description and id", async () => {
      const caller = createCaller(createMockContext())

      expect(
        (await caller.routers.list({ project_id: TEST_PROJECT_ID, searchTerm: "internal" })).map((r) => r.id)
      ).toEqual(["router-2"])
      expect(
        (await caller.routers.list({ project_id: TEST_PROJECT_ID, searchTerm: "router-1" })).map((r) => r.id)
      ).toEqual(["router-1"])
    })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(caller.routers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const caller = createCaller(createMockContext({ noNetworkService: true }))

    await expect(caller.routers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.routers.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in routersRouter.list" })
    )
  })

  it("throws FORBIDDEN when Neutron returns 403", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden" }))

    await expect(caller.routers.list({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

describe("routersRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the router detail endpoint with the requested ID", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.getById({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(ctx.__networkGetMock).toHaveBeenCalledWith("v2.0/routers/router-1")
  })

  it("returns a router on success", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.routers.getById({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(result.id).toBe("router-1")
    expect(result.external_gateway_info?.external_fixed_ips?.[0].ip_address).toBe("172.24.4.10")
  })

  it("throws NOT_FOUND with a friendly message when Neutron returns 404", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

    await expect(caller.routers.getById({ project_id: TEST_PROJECT_ID, router_id: "router-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Router router-x was not found." })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.routers.getById({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in routersRouter.getById" })
    )
  })

  it("rejects an empty router_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.routers.getById({ project_id: TEST_PROJECT_ID, router_id: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })
})

describe("routersRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts only the provided fields and does not send project_id", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.create({ project_id: TEST_PROJECT_ID, name: "r1" })

    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/routers", { router: { name: "r1" } })
  })

  it("includes the external gateway in the request body", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.create({
      project_id: TEST_PROJECT_ID,
      name: "r1",
      description: "desc",
      admin_state_up: false,
      external_gateway_info: {
        network_id: "ext-net-1",
        enable_snat: false,
        external_fixed_ips: [{ subnet_id: "ext-subnet-1" }],
      },
    })

    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/routers", {
      router: {
        name: "r1",
        description: "desc",
        admin_state_up: false,
        external_gateway_info: {
          network_id: "ext-net-1",
          enable_snat: false,
          external_fixed_ips: [{ subnet_id: "ext-subnet-1" }],
        },
      },
    })
  })

  it("returns the created router on success", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.routers.create({ project_id: TEST_PROJECT_ID, name: "edge-router" })

    expect(result.id).toBe("router-1")
  })

  it("rejects invalid input before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.routers.create({ project_id: TEST_PROJECT_ID, name: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkPostMock).not.toHaveBeenCalled()
  })

  it("surfaces Neutron OverQuota (409) as a quota message", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "Quota exceeded for resources: ['router']." })
    )

    await expect(caller.routers.create({ project_id: TEST_PROJECT_ID, name: "r1" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/quota exceeded/i),
    })
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.routers.create({ project_id: TEST_PROJECT_ID, name: "r1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in routersRouter.create" })
    )
  })
})

describe("routersRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("puts only the provided fields to the router endpoint", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.update({
      project_id: TEST_PROJECT_ID,
      router_id: "router-1",
      name: "renamed",
      routes: [{ destination: "10.1.0.0/16", nexthop: "10.0.0.5" }],
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1", {
      router: { name: "renamed", routes: [{ destination: "10.1.0.0/16", nexthop: "10.0.0.5" }] },
    })
  })

  it("sends an empty routes array to clear extra routes", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.update({ project_id: TEST_PROJECT_ID, router_id: "router-1", routes: [] })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1", { router: { routes: [] } })
  })

  it("throws BAD_REQUEST when no fields are provided", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.routers.update({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
    )
    expect(ctx.__networkPutMock).not.toHaveBeenCalled()
  })

  it("throws CONFLICT with a friendly message when Neutron returns 409", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "Conflict" }))

    await expect(
      caller.routers.update({ project_id: TEST_PROJECT_ID, router_id: "router-1", distributed: true })
    ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/admin state is DOWN/) })
  })
})

describe("routersRouter.setGateway / clearGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sets the external gateway", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.setGateway({
      project_id: TEST_PROJECT_ID,
      router_id: "router-2",
      external_gateway_info: { network_id: "ext-net-1" },
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-2", {
      router: { external_gateway_info: { network_id: "ext-net-1" } },
    })
  })

  it("clears the external gateway with an empty object", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.clearGateway({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1", {
      router: { external_gateway_info: {} },
    })
  })

  it("throws CONFLICT when floating IPs block clearing the gateway", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "Conflict" }))

    await expect(
      caller.routers.clearGateway({ project_id: TEST_PROJECT_ID, router_id: "router-1" })
    ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/floating IPs/) })
  })
})

describe("routersRouter.addInterface / removeInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adds an interface by subnet", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.routers.addInterface({
      project_id: TEST_PROJECT_ID,
      router_id: "router-1",
      subnet_id: "subnet-1",
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1/add_router_interface", {
      subnet_id: "subnet-1",
    })
    expect(result.port_id).toBe("port-if-1")
  })

  it("adds an interface by port", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.addInterface({ project_id: TEST_PROJECT_ID, router_id: "router-1", port_id: "port-9" })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1/add_router_interface", {
      port_id: "port-9",
    })
  })

  it("rejects both subnet_id and port_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.routers.addInterface({
        project_id: TEST_PROJECT_ID,
        router_id: "router-1",
        subnet_id: "subnet-1",
        port_id: "port-9",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(ctx.__networkPutMock).not.toHaveBeenCalled()
  })

  it("appends Neutron's detail on 400", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 400, statusText: "Router already has a port on subnet subnet-1" })
    )

    await expect(
      caller.routers.addInterface({ project_id: TEST_PROJECT_ID, router_id: "router-1", subnet_id: "subnet-1" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Router already has a port on subnet subnet-1"),
    })
  })

  it("removes an interface by subnet", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.removeInterface({ project_id: TEST_PROJECT_ID, router_id: "router-1", subnet_id: "subnet-1" })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/routers/router-1/remove_router_interface", {
      subnet_id: "subnet-1",
    })
  })

  it("throws NOT_FOUND when the interface is not attached", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

    await expect(
      caller.routers.removeInterface({ project_id: TEST_PROJECT_ID, router_id: "router-1", subnet_id: "subnet-1" })
    ).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "The interface is not attached to router router-1." })
    )
  })
})

describe("routersRouter.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the router delete endpoint with the requested ID", async () => {
    const ctx = createMockContext({ httpStatus: 204 })
    const caller = createCaller(ctx)

    await caller.routers.delete({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(ctx.__networkDelMock).toHaveBeenCalledWith("v2.0/routers/router-1")
  })

  it("returns true on successful deletion", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 204 }))

    expect(await caller.routers.delete({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).toBe(true)
  })

  it("throws CONFLICT when the router still has interfaces", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "Router router-1 still has ports" }))

    await expect(caller.routers.delete({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: "The router still has attached interfaces. Remove all interfaces before deleting it.",
      })
    )
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(caller.routers.delete({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })
})

describe("routersRouter.listInterfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("queries router ports by device_id with selected fields", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    const { path, params } = splitUrl(ctx.__networkGetMock.mock.calls[0][0] as string)
    expect(path).toBe("v2.0/ports")
    expect(params.get("device_id")).toBe("router-1")
    expect(params.getAll("fields")).toEqual([
      "id",
      "name",
      "network_id",
      "device_owner",
      "status",
      "admin_state_up",
      "mac_address",
      "fixed_ips",
    ])
  })

  it("returns only interface ports, enriched with subnet name and CIDR", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(result).toHaveLength(1)
    expect(result[0].port_id).toBe("port-if-1")
    expect(result[0].fixed_ips[0]).toEqual({
      subnet_id: "subnet-1",
      subnet_name: "private-subnet",
      subnet_cidr: "10.0.0.0/24",
      ip_address: "10.0.0.1",
    })

    const { path, params } = splitUrl(ctx.__networkGetMock.mock.calls[1][0] as string)
    expect(path).toBe("v2.0/subnets")
    expect(params.getAll("id")).toEqual(["subnet-1"])
    expect(params.getAll("fields")).toEqual(["id", "name", "cidr"])
  })

  it("still returns interfaces when the subnets request fails", async () => {
    const caller = createCaller(createMockContext({ subnetsFail: true }))

    const result = await caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(result).toHaveLength(1)
    expect(result[0].fixed_ips[0].subnet_id).toBe("subnet-1")
    expect(result[0].fixed_ips[0].subnet_name).toBeUndefined()
  })

  it("does not query subnets when the router has no interfaces", async () => {
    const ctx = createMockContext({ mockPorts: [defaultPorts[1]] })
    const caller = createCaller(ctx)

    const result = await caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })

    expect(result).toEqual([])
    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
  })

  it("throws when Neutron returns a non-ok response for ports", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden" }))

    await expect(
      caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("throws PARSE_ERROR when the ports response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.routers.listInterfaces({ project_id: TEST_PROJECT_ID, router_id: "router-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in routersRouter.listInterfaces" })
    )
  })
})

describe("routersRouter.listExtensions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns router extension flags", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.routers.listExtensions({ project_id: TEST_PROJECT_ID })

    expect(ctx.__networkGetMock).toHaveBeenCalledWith("v2.0/extensions")
    expect(result).toMatchObject({ dvr: true, extraRoute: true, l3Ha: true, ndpProxy: false })
  })

  it("throws PARSE_ERROR when the extensions response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.routers.listExtensions({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in routersRouter.listExtensions" })
    )
  })
})
