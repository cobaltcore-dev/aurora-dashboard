import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { networksRouter } from "./networksRouter"
import { AuroraPortalContext } from "@/server/context"

const TEST_PROJECT_ID = "proj-1"

const defaultNetworks = [
  {
    id: "net-1",
    name: "private",
    description: "App tier",
    status: "ACTIVE",
    admin_state_up: true,
    shared: false,
    subnets: ["subnet-v4", "subnet-v6"],
    mtu: 8950,
    "router:external": false,
    port_security_enabled: true,
    project_id: TEST_PROJECT_ID,
    tags: ["env:prod"],
    created_at: "2025-02-28T14:36:21Z",
    updated_at: "2025-02-28T14:36:21Z",
  },
  {
    id: "net-2",
    name: "db",
    description: "",
    status: "DOWN",
    admin_state_up: false,
    shared: true,
    subnets: [],
    mtu: 1500,
    project_id: TEST_PROJECT_ID,
  },
]

const defaultSharedNetworks = [
  // Own shared network, also returned by the project_id request
  defaultNetworks[1],
  {
    id: "net-3",
    name: "corporate",
    description: "Shared by the network team",
    status: "ACTIVE",
    admin_state_up: true,
    shared: true,
    subnets: ["subnet-3"],
    mtu: 1500,
    project_id: "other-project",
  },
]

const defaultSubnets = [
  {
    id: "subnet-v4",
    name: "private-v4",
    cidr: "10.0.0.0/24",
    ip_version: 4,
    gateway_ip: "10.0.0.1",
    enable_dhcp: true,
  },
  { id: "subnet-v6", name: "private-v6", cidr: "fd00::/64", ip_version: 6, gateway_ip: null, enable_dhcp: false },
  { id: "subnet-3", name: "corporate-sub", cidr: "10.10.0.0/16", ip_version: 4, gateway_ip: "10.10.0.1" },
]

const subnetNetworkIds: Record<string, string> = { "subnet-v4": "net-1", "subnet-v6": "net-1", "subnet-3": "net-3" }

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  httpStatus?: number
  statusText?: string
  subnetsFail?: boolean
  mockNetworks?: unknown[]
  mockSharedNetworks?: unknown[]
  /** "throw" (default) mirrors signal-openstack: non-2xx rejects with SignalOpenstackApiError. "response" resolves with ok: false. */
  errorMode?: "throw" | "response"
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    httpStatus = 200,
    statusText,
    subnetsFail = false,
    mockNetworks = defaultNetworks,
    mockSharedNetworks = defaultSharedNetworks,
    errorMode = "throw",
  } = opts || {}

  const ok = httpStatus >= 200 && httpStatus < 300
  const response = (body: unknown, overrides: { ok?: boolean; status?: number } = {}) => ({
    ok: overrides.ok ?? ok,
    status: overrides.status ?? httpStatus,
    statusText: statusText ?? (ok ? "OK" : "Error"),
    json: vi.fn().mockResolvedValue(parseError ? { invalid: "data" } : body),
  })

  const reply = (body: unknown, overrides: { ok?: boolean; status?: number } = {}) => {
    const res = response(body, overrides)
    if (!res.ok && errorMode === "throw") return Promise.reject(new SignalOpenstackApiError(res.statusText, res.status))
    return Promise.resolve(res)
  }

  const networkGetMock = vi.fn().mockImplementation((url: string) => {
    const params = new URLSearchParams(url.split("?")[1])
    if (url.startsWith("v2.0/subnets")) {
      // Lookups honour the `id` and `network_id` filters like Neutron does
      const networkId = params.get("network_id")
      if (networkId)
        return reply({ subnets: defaultSubnets.filter((subnet) => subnetNetworkIds[subnet.id] === networkId) })
      if (subnetsFail) return reply({}, { ok: false, status: 500 })
      const ids = params.getAll("id")
      return reply({ subnets: defaultSubnets.filter((subnet) => ids.includes(subnet.id)) }, { ok: true })
    }
    if (url.startsWith("v2.0/networks/")) return reply({ network: mockNetworks[0] })
    return reply({ networks: params.get("shared") === "true" ? mockSharedNetworks : mockNetworks })
  })

  const networkPostMock = vi.fn().mockImplementation(() => reply({ network: mockNetworks[0] }))
  const networkPutMock = vi
    .fn()
    .mockImplementation((url: string, body: { tags?: string[] }) =>
      url.endsWith("/tags") ? reply({ tags: body.tags }) : reply({ network: mockNetworks[0] })
    )

  const networkDelMock = vi.fn().mockImplementation(() => {
    const res = { ok, status: httpStatus, statusText: statusText ?? (ok ? "No Content" : "Error") }
    if (!ok && errorMode === "throw") return Promise.reject(new SignalOpenstackApiError(res.statusText, res.status))
    return Promise.resolve(res)
  })

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
    networks: networksRouter,
  })
)

const splitUrl = (url: string) => {
  const [path, query] = url.split("?")
  return { path, params: new URLSearchParams(query) }
}

const requestedUrls = (ctx: ReturnType<typeof createMockContext>): string[] =>
  ctx.__networkGetMock.mock.calls.map((call: unknown[]) => call[0] as string)

const networkListUrls = (ctx: ReturnType<typeof createMockContext>) =>
  requestedUrls(ctx)
    .filter((url) => url.startsWith("v2.0/networks"))
    .map(splitUrl)

describe("networksRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns own and shared networks, merged by ID", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.networks.list({ project_id: TEST_PROJECT_ID })

    expect(result.map((network) => network.id)).toEqual(["net-1", "net-2", "net-3"])
  })

  it("requests own networks by project_id and shared networks by shared=true", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.list({ project_id: TEST_PROJECT_ID })

    const [own, shared] = networkListUrls(ctx)
    expect(own.path).toBe("v2.0/networks")
    expect(own.params.get("project_id")).toBe(TEST_PROJECT_ID)
    expect(own.params.has("shared")).toBe(false)
    expect(shared.path).toBe("v2.0/networks")
    expect(shared.params.get("shared")).toBe("true")
    expect(shared.params.has("project_id")).toBe(false)
  })

  it("only requests shared networks when shared=true", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.networks.list({ project_id: TEST_PROJECT_ID, shared: true })

    const urls = networkListUrls(ctx)
    expect(urls).toHaveLength(1)
    expect(urls[0].params.get("shared")).toBe("true")
    expect(result.map((network) => network.id)).toEqual(["net-2", "net-3"])
  })

  it("only requests own unshared networks when shared=false", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.list({ project_id: TEST_PROJECT_ID, shared: false })

    const urls = networkListUrls(ctx)
    expect(urls).toHaveLength(1)
    expect(urls[0].params.get("project_id")).toBe(TEST_PROJECT_ID)
    expect(urls[0].params.get("shared")).toBe("false")
  })

  it("forwards Neutron filters to both requests and maps tag keys, but not the search term", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.list({
      project_id: TEST_PROJECT_ID,
      name: "private",
      status: "ACTIVE",
      admin_state_up: true,
      "router:external": false,
      mtu: 1500,
      sort_key: "name",
      sort_dir: "desc",
      tags_any: "prod",
      not_tags: "old",
      searchTerm: "net",
    })

    for (const { params } of networkListUrls(ctx)) {
      expect(params.get("name")).toBe("private")
      expect(params.get("status")).toBe("ACTIVE")
      expect(params.get("admin_state_up")).toBe("true")
      expect(params.get("router:external")).toBe("false")
      expect(params.get("mtu")).toBe("1500")
      expect(params.get("sort_key")).toBe("name")
      expect(params.get("sort_dir")).toBe("desc")
      expect(params.get("tags-any")).toBe("prod")
      expect(params.get("not-tags")).toBe("old")
      expect(params.has("tags_any")).toBe(false)
      expect(params.has("searchTerm")).toBe(false)
    }
  })

  it("re-sorts the merged list by the sort key", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.networks.list({ project_id: TEST_PROJECT_ID, sort_key: "name", sort_dir: "asc" })

    expect(result.map((network) => network.name)).toEqual(["corporate", "db", "private"])
  })

  it("filters by search term on ID, name and description", async () => {
    const caller = createCaller(createMockContext())

    expect((await caller.networks.list({ project_id: TEST_PROJECT_ID, searchTerm: "APP" })).map((n) => n.id)).toEqual([
      "net-1",
    ])
    expect((await caller.networks.list({ project_id: TEST_PROJECT_ID, searchTerm: "net-3" })).map((n) => n.id)).toEqual(
      ["net-3"]
    )
  })

  it("returns an empty array without lookups when no networks exist", async () => {
    const ctx = createMockContext({ mockNetworks: [], mockSharedNetworks: [] })
    const caller = createCaller(ctx)

    expect(await caller.networks.list({ project_id: TEST_PROJECT_ID })).toEqual([])
    expect(requestedUrls(ctx).some((url) => url.startsWith("v2.0/subnets"))).toBe(false)
  })

  describe("subnet enrichment", () => {
    it("adds subnet names", async () => {
      const caller = createCaller(createMockContext())

      const [net1, net2, net3] = await caller.networks.list({ project_id: TEST_PROJECT_ID })

      expect(net1.subnet_details).toEqual([
        { id: "subnet-v4", name: "private-v4" },
        { id: "subnet-v6", name: "private-v6" },
      ])
      expect(net2.subnet_details).toEqual([])
      expect(net3.subnet_details).toEqual([{ id: "subnet-3", name: "corporate-sub" }])
    })

    it("resolves names with one batched subnets request", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.networks.list({ project_id: TEST_PROJECT_ID })

      const subnetUrls = requestedUrls(ctx).filter((url) => url.startsWith("v2.0/subnets"))
      expect(subnetUrls).toHaveLength(1)
      const { params } = splitUrl(subnetUrls[0])
      expect(params.getAll("id")).toEqual(["subnet-v4", "subnet-v6", "subnet-3"])
      expect(params.getAll("fields")).toEqual(["id", "name"])
    })

    it("only looks up subnets of networks matching the search term", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.networks.list({ project_id: TEST_PROJECT_ID, searchTerm: "corporate" })

      const subnetUrl = requestedUrls(ctx).find((url) => url.startsWith("v2.0/subnets"))!
      expect(splitUrl(subnetUrl).params.getAll("id")).toEqual(["subnet-3"])
    })

    it("falls back to subnet IDs when the lookup fails", async () => {
      const caller = createCaller(createMockContext({ subnetsFail: true }))

      const [net1] = await caller.networks.list({ project_id: TEST_PROJECT_ID })

      expect(net1.subnet_details).toEqual([
        { id: "subnet-v4", name: undefined },
        { id: "subnet-v6", name: undefined },
      ])
    })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(caller.networks.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when the network service is unavailable", async () => {
    const caller = createCaller(createMockContext({ noNetworkService: true }))

    await expect(caller.networks.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.networks.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in networksRouter.list" })
    )
  })

  it.each(["throw", "response"] as const)("maps a 403 from Neutron (errorMode=%s)", async (errorMode) => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden", errorMode }))

    await expect(caller.networks.list({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Access forbidden to Network: Forbidden",
    })
  })

  it("rejects an unsupported sort key before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      // @ts-expect-error invalid sort key
      caller.networks.list({ project_id: TEST_PROJECT_ID, sort_key: "subnets" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })
})

describe("networksRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the network", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.networks.getById({ project_id: TEST_PROJECT_ID, network_id: "net-1" })

    expect(result).toMatchObject({ id: "net-1", name: "private", mtu: 8950, "router:external": false })
    expect(requestedUrls(ctx)).toEqual(["v2.0/networks/net-1"])
  })

  it("maps 404 to a not found message", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Network net-x could not be found" }))

    await expect(caller.networks.getById({ project_id: TEST_PROJECT_ID, network_id: "net-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Network net-x was not found." })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.networks.getById({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in networksRouter.getById" })
    )
  })

  it("rejects an empty network_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.networks.getById({ project_id: TEST_PROJECT_ID, network_id: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })

  it("rejects IDs with path characters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.networks.getById({ project_id: TEST_PROJECT_ID, network_id: "../ports" })).rejects.toThrow()
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })
})

describe("networksRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts only the provided fields, without project_id", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.networks.create({
      project_id: TEST_PROJECT_ID,
      name: "private",
      admin_state_up: false,
      port_security_enabled: true,
    })

    expect(result.id).toBe("net-1")
    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/networks", {
      network: { name: "private", admin_state_up: false, port_security_enabled: true },
    })
  })

  it("forwards admin-only fields as given", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.create({ project_id: TEST_PROJECT_ID, name: "ext", shared: true, "router:external": true })

    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/networks", {
      network: { name: "ext", shared: true, "router:external": true },
    })
  })

  it("rejects an empty name before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.networks.create({ project_id: TEST_PROJECT_ID, name: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkPostMock).not.toHaveBeenCalled()
  })

  it("maps 403 to the admin-only message", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "rule:create_network:shared" }))

    await expect(
      caller.networks.create({ project_id: TEST_PROJECT_ID, name: "n", shared: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringMatching(/require admin rights/) })
  })

  it("maps a 409 quota error", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "Quota exceeded for resources: ['network']." })
    )

    await expect(caller.networks.create({ project_id: TEST_PROJECT_ID, name: "n" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/^Network quota exceeded/),
    })
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.networks.create({ project_id: TEST_PROJECT_ID, name: "n" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in networksRouter.create" })
    )
  })
})

describe("networksRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("puts only the provided fields", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.update({ project_id: TEST_PROJECT_ID, network_id: "net-1", name: "renamed", mtu: 1450 })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/networks/net-1", {
      network: { name: "renamed", mtu: 1450 },
    })
  })

  it("sends false values", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.networks.update({ project_id: TEST_PROJECT_ID, network_id: "net-1", admin_state_up: false })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/networks/net-1", { network: { admin_state_up: false } })
  })

  it("rejects an empty update before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.networks.update({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
    )
    expect(ctx.__networkPutMock).not.toHaveBeenCalled()
  })

  it("maps 409 to the sharing conflict message", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "Unable to reconfigure sharing settings" })
    )

    await expect(
      caller.networks.update({ project_id: TEST_PROJECT_ID, network_id: "net-1", shared: false })
    ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/Sharing can't be disabled/) })
  })

  it("maps 404 to a not found message", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404 }))

    await expect(
      caller.networks.update({ project_id: TEST_PROJECT_ID, network_id: "net-x", name: "n" })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Network net-x was not found." }))
  })
})

describe("networksRouter.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes the network and returns true", async () => {
    const ctx = createMockContext({ httpStatus: 204 })
    const caller = createCaller(ctx)

    expect(await caller.networks.delete({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).toBe(true)
    expect(ctx.__networkDelMock).toHaveBeenCalledWith("v2.0/networks/net-1")
  })

  it.each(["throw", "response"] as const)("maps 409 to the ports-in-use message (errorMode=%s)", async (errorMode) => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "There are one or more ports still in use", errorMode })
    )

    await expect(caller.networks.delete({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/still has ports in use/),
    })
  })

  it("maps 404 to a not found message", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404 }))

    await expect(caller.networks.delete({ project_id: TEST_PROJECT_ID, network_id: "net-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Network net-x was not found." })
    )
  })
})

describe("networksRouter.setTags", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("replaces the tags and returns the new list", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.networks.setTags({
      project_id: TEST_PROJECT_ID,
      network_id: "net-1",
      tags: ["env:prod", " team:net ", "env:prod"],
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/networks/net-1/tags", { tags: ["env:prod", "team:net"] })
    expect(result).toEqual(["env:prod", "team:net"])
  })

  it("removes all tags with an empty list", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    expect(await caller.networks.setTags({ project_id: TEST_PROJECT_ID, network_id: "net-1", tags: [] })).toEqual([])
    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/networks/net-1/tags", { tags: [] })
  })

  it("rejects invalid tags before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.networks.setTags({ project_id: TEST_PROJECT_ID, network_id: "net-1", tags: ["a,b"] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(ctx.__networkPutMock).not.toHaveBeenCalled()
  })

  it("maps 404 to a not found message", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404 }))

    await expect(
      caller.networks.setTags({ project_id: TEST_PROJECT_ID, network_id: "net-x", tags: ["a"] })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Network net-x was not found." }))
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(
      caller.networks.setTags({ project_id: TEST_PROJECT_ID, network_id: "net-1", tags: ["a"] })
    ).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in networksRouter.setTags" })
    )
  })
})

describe("networksRouter.listSubnets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the subnets of the network", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.networks.listSubnets({ project_id: TEST_PROJECT_ID, network_id: "net-1" })

    expect(result.map((subnet) => subnet.id)).toEqual(["subnet-v4", "subnet-v6"])
    expect(result[0]).toMatchObject({ cidr: "10.0.0.0/24", ip_version: 4, gateway_ip: "10.0.0.1", enable_dhcp: true })

    const { path, params } = splitUrl(requestedUrls(ctx)[0])
    expect(path).toBe("v2.0/subnets")
    expect(params.get("network_id")).toBe("net-1")
    expect(params.getAll("fields")).toEqual(["id", "name", "cidr", "ip_version", "gateway_ip", "enable_dhcp"])
  })

  it("returns [] for a network without subnets", async () => {
    const caller = createCaller(createMockContext())

    expect(await caller.networks.listSubnets({ project_id: TEST_PROJECT_ID, network_id: "net-2" })).toEqual([])
  })

  it("maps Neutron errors", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden" }))

    await expect(
      caller.networks.listSubnets({ project_id: TEST_PROJECT_ID, network_id: "net-1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Access forbidden to net-1: Forbidden" })
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.networks.listSubnets({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in networksRouter.listSubnets" })
    )
  })
})
