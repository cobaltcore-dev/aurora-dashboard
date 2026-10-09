import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { portsRouter } from "./portsRouter"
import { AuroraPortalContext } from "@/server/context"

const TEST_PROJECT_ID = "proj-1"

const defaultPorts = [
  {
    id: "port-1",
    name: "",
    description: "",
    network_id: "net-1",
    mac_address: "fa:16:3e:50:a2:79",
    admin_state_up: true,
    status: "DOWN",
    device_id: "server-1",
    device_owner: "compute:qa-de-1b",
    fixed_ips: [
      { subnet_id: "subnet-v4", ip_address: "10.180.242.42" },
      { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328" },
    ],
    security_groups: ["sg-default"],
    project_id: TEST_PROJECT_ID,
    created_at: "2025-02-28T14:36:21Z",
    updated_at: "2025-02-28T14:36:21Z",
  },
  {
    id: "port-2",
    name: "reserved-ip",
    description: "Reserved for the DB VM",
    network_id: "net-2",
    mac_address: "fa:16:3e:aa:bb:cc",
    admin_state_up: true,
    status: "ACTIVE",
    device_id: "",
    device_owner: "",
    fixed_ips: [{ subnet_id: "subnet-2", ip_address: "10.180.128.20" }],
    security_groups: [],
    project_id: TEST_PROJECT_ID,
  },
]

const defaultNetworks = [
  { id: "net-1", name: "dualstack-test" },
  { id: "net-2", name: "cc-demo_private" },
]

const defaultSubnets = [
  { id: "subnet-v4", name: "dualstack-v4" },
  { id: "subnet-v6", name: "dualstack-v6" },
  { id: "subnet-2", name: "cc-demo_private_sub2" },
]

const defaultSecurityGroups = [{ id: "sg-default", name: "default" }]

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  httpStatus?: number
  statusText?: string
  networksFail?: boolean
  subnetsFail?: boolean
  securityGroupsFail?: boolean
  mockPorts?: unknown[]
  /** "throw" (default) mirrors signal-openstack: non-2xx rejects with SignalOpenstackApiError. "response" resolves with ok: false. */
  errorMode?: "throw" | "response"
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    httpStatus = 200,
    statusText,
    networksFail = false,
    subnetsFail = false,
    securityGroupsFail = false,
    mockPorts = defaultPorts,
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

  // Lookups honour the `id` filter like Neutron does
  const byIds = <T extends { id: string }>(url: string, items: T[]) => {
    const ids = new URLSearchParams(url.split("?")[1]).getAll("id")
    return items.filter((item) => ids.includes(item.id))
  }

  const networkGetMock = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("v2.0/networks")) {
      return networksFail
        ? reply({}, { ok: false, status: 403 })
        : reply({ networks: byIds(url, defaultNetworks) }, { ok: true })
    }
    if (url.startsWith("v2.0/subnets")) {
      return subnetsFail
        ? reply({}, { ok: false, status: 500 })
        : reply({ subnets: byIds(url, defaultSubnets) }, { ok: true })
    }
    if (url.startsWith("v2.0/security-groups")) {
      return securityGroupsFail
        ? reply({}, { ok: false, status: 403 })
        : reply({ security_groups: byIds(url, defaultSecurityGroups) }, { ok: true })
    }
    if (url.startsWith("v2.0/ports/")) return reply({ port: mockPorts[0] })
    return reply({ ports: mockPorts })
  })

  const networkPostMock = vi.fn().mockImplementation(() => reply({ port: mockPorts[0] }))
  const networkPutMock = vi.fn().mockImplementation(() => reply({ port: mockPorts[0] }))

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
    ports: portsRouter,
  })
)

const splitUrl = (url: string) => {
  const [path, query] = url.split("?")
  return { path, params: new URLSearchParams(query) }
}

const requestedUrls = (ctx: ReturnType<typeof createMockContext>): string[] =>
  ctx.__networkGetMock.mock.calls.map((call: unknown[]) => call[0] as string)

describe("portsRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of ports on success", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.ports.list({ project_id: TEST_PROJECT_ID })

    expect(result.map((port) => port.id)).toEqual(["port-1", "port-2"])
  })

  it("returns an empty array without lookups when no ports exist", async () => {
    const ctx = createMockContext({ mockPorts: [] })
    const caller = createCaller(ctx)

    expect(await caller.ports.list({ project_id: TEST_PROJECT_ID })).toEqual([])
    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
  })

  it("scopes the list to the current project", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.list({ project_id: TEST_PROJECT_ID })

    const { path, params } = splitUrl(requestedUrls(ctx)[0])
    expect(path).toBe("v2.0/ports")
    expect(params.get("project_id")).toBe(TEST_PROJECT_ID)
    expect(params.has("network_id")).toBe(false)
  })

  it("filters by network when network_id is given", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.list({ project_id: TEST_PROJECT_ID, network_id: "net-1" })

    const { params } = splitUrl(requestedUrls(ctx)[0])
    expect(params.get("network_id")).toBe("net-1")
    expect(params.get("project_id")).toBe(TEST_PROJECT_ID)
  })

  it("forwards Neutron filters and maps tag keys, but not the search term", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.list({
      project_id: TEST_PROJECT_ID,
      status: "ACTIVE",
      device_owner: "compute:qa-de-1b",
      device_id: "server-1",
      mac_address: "fa:16:3e:50:a2:79",
      admin_state_up: true,
      sort_key: "name",
      sort_dir: "desc",
      tags_any: "prod",
      not_tags: "old",
      searchTerm: "port",
    })

    const { params } = splitUrl(requestedUrls(ctx)[0])
    expect(params.get("status")).toBe("ACTIVE")
    expect(params.get("device_owner")).toBe("compute:qa-de-1b")
    expect(params.get("device_id")).toBe("server-1")
    expect(params.get("mac_address")).toBe("fa:16:3e:50:a2:79")
    expect(params.get("admin_state_up")).toBe("true")
    expect(params.get("sort_key")).toBe("name")
    expect(params.get("sort_dir")).toBe("desc")
    expect(params.get("tags-any")).toBe("prod")
    expect(params.get("not-tags")).toBe("old")
    expect(params.has("tags_any")).toBe(false)
    expect(params.has("searchTerm")).toBe(false)
  })

  describe("name enrichment", () => {
    it("adds the network name and the IP version and subnet name of each fixed IP", async () => {
      const caller = createCaller(createMockContext())

      const [port1, port2] = await caller.ports.list({ project_id: TEST_PROJECT_ID })

      expect(port1.network_name).toBe("dualstack-test")
      expect(port1.fixed_ips).toEqual([
        { subnet_id: "subnet-v4", ip_address: "10.180.242.42", ip_version: 4, subnet_name: "dualstack-v4" },
        { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328", ip_version: 6, subnet_name: "dualstack-v6" },
      ])
      expect(port2.network_name).toBe("cc-demo_private")
    })

    it("resolves names with one batched networks request and one batched subnets request", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.ports.list({ project_id: TEST_PROJECT_ID })

      const urls = requestedUrls(ctx)
      // ports, networks, subnets
      expect(urls).toHaveLength(3)

      const networks = splitUrl(urls.find((url) => url.startsWith("v2.0/networks"))!)
      expect(networks.params.getAll("id")).toEqual(["net-1", "net-2"])
      expect(networks.params.getAll("fields")).toEqual(["id", "name"])

      const subnets = splitUrl(urls.find((url) => url.startsWith("v2.0/subnets"))!)
      expect(subnets.params.getAll("id")).toEqual(["subnet-v4", "subnet-v6", "subnet-2"])
      expect(subnets.params.getAll("fields")).toEqual(["id", "name"])
    })

    it("does not look up security groups in the list", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await caller.ports.list({ project_id: TEST_PROJECT_ID })

      expect(requestedUrls(ctx).some((url) => url.startsWith("v2.0/security-groups"))).toBe(false)
    })

    it("splits name lookups into chunks of 50 IDs", async () => {
      const manyPorts = Array.from({ length: 51 }, (_, i) => ({
        ...defaultPorts[1],
        id: `port-${i}`,
        network_id: `net-${i}`,
        fixed_ips: [],
      }))
      const ctx = createMockContext({ mockPorts: manyPorts })
      const caller = createCaller(ctx)

      await caller.ports.list({ project_id: TEST_PROJECT_ID })

      const networkRequests = requestedUrls(ctx).filter((url) => url.startsWith("v2.0/networks"))
      expect(networkRequests.map((url) => splitUrl(url).params.getAll("id").length)).toEqual([50, 1])
      // no fixed IPs → no subnets request
      expect(requestedUrls(ctx).some((url) => url.startsWith("v2.0/subnets"))).toBe(false)
    })

    it("still returns ports with IDs only when name lookups fail", async () => {
      const caller = createCaller(createMockContext({ networksFail: true, subnetsFail: true }))

      const [port1] = await caller.ports.list({ project_id: TEST_PROJECT_ID })

      expect(port1.network_id).toBe("net-1")
      expect(port1.network_name).toBeUndefined()
      expect(port1.fixed_ips[0]).toEqual({
        subnet_id: "subnet-v4",
        ip_address: "10.180.242.42",
        ip_version: 4,
        subnet_name: undefined,
      })
    })
  })

  describe("BFF-side search", () => {
    it.each([
      ["port-2", ["port-2"]],
      ["reserved", ["port-2"]],
      ["10.180.242", ["port-1"]],
      ["dualstack", ["port-1"]],
      ["private_sub2", ["port-2"]],
      ["compute:", ["port-1"]],
      ["10.180", ["port-1", "port-2"]],
      ["nothing", []],
    ])("matches %s", async (searchTerm, expected) => {
      const caller = createCaller(createMockContext())

      const result = await caller.ports.list({ project_id: TEST_PROJECT_ID, searchTerm })

      expect(result.map((port) => port.id)).toEqual(expected)
    })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when the network service is unavailable", async () => {
    const caller = createCaller(createMockContext({ noNetworkService: true }))

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Network service is not available" })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in portsRouter.list" })
    )
  })

  it("throws FORBIDDEN when Neutron denies listing ports", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 403, statusText: "Forbidden" }))

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "Access forbidden to Port: Forbidden" })
    )
  })

  it("rejects an empty network_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID, network_id: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })
})

describe("portsRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the port detail endpoint with the requested ID", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-1" })

    expect(ctx.__networkGetMock).toHaveBeenCalledWith("v2.0/ports/port-1")
  })

  it("returns the port enriched with network, subnet and security group names", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-1" })

    expect(result.id).toBe("port-1")
    expect(result.mac_address).toBe("fa:16:3e:50:a2:79")
    expect(result.network_name).toBe("dualstack-test")
    expect(result.fixed_ips.map((fixedIp) => [fixedIp.ip_version, fixedIp.subnet_name])).toEqual([
      [4, "dualstack-v4"],
      [6, "dualstack-v6"],
    ])
    expect(result.security_groups).toEqual([{ id: "sg-default", name: "default" }])
  })

  it("resolves names with one request per lookup", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-1" })

    const urls = requestedUrls(ctx)
    expect(urls).toHaveLength(4)
    expect(splitUrl(urls.find((url) => url.startsWith("v2.0/networks"))!).params.getAll("id")).toEqual(["net-1"])
    expect(splitUrl(urls.find((url) => url.startsWith("v2.0/subnets"))!).params.getAll("id")).toEqual([
      "subnet-v4",
      "subnet-v6",
    ])
    const securityGroups = splitUrl(urls.find((url) => url.startsWith("v2.0/security-groups"))!)
    expect(securityGroups.params.getAll("id")).toEqual(["sg-default"])
    expect(securityGroups.params.getAll("fields")).toEqual(["id", "name"])
  })

  it("skips the security groups lookup for a port without security groups", async () => {
    const ctx = createMockContext({ mockPorts: [defaultPorts[1]] })
    const caller = createCaller(ctx)

    const result = await caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-2" })

    expect(result.security_groups).toEqual([])
    expect(requestedUrls(ctx).some((url) => url.startsWith("v2.0/security-groups"))).toBe(false)
  })

  it("still returns the port with IDs only when lookups fail", async () => {
    const caller = createCaller(createMockContext({ networksFail: true, subnetsFail: true, securityGroupsFail: true }))

    const result = await caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-1" })

    expect(result.network_name).toBeUndefined()
    expect(result.fixed_ips[0].subnet_name).toBeUndefined()
    expect(result.security_groups).toEqual([{ id: "sg-default", name: undefined }])
  })

  it("throws NOT_FOUND with a friendly message when Neutron returns 404", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

    await expect(caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Port port-x was not found." })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in portsRouter.getById" })
    )
  })

  it("rejects an empty port_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
    expect(ctx.__networkGetMock).not.toHaveBeenCalled()
  })
})

describe("portsRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts only the provided fields and never project_id", async () => {
    const ctx = createMockContext({ httpStatus: 201 })
    const caller = createCaller(ctx)

    await caller.ports.create({
      project_id: TEST_PROJECT_ID,
      network_id: "net-1",
      name: "reserved-ip",
      fixed_ips: [{ subnet_id: "subnet-v4", ip_address: "10.180.242.50" }, { subnet_id: "subnet-v6" }],
      security_groups: ["sg-default"],
    })

    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/ports", {
      port: {
        network_id: "net-1",
        name: "reserved-ip",
        fixed_ips: [{ subnet_id: "subnet-v4", ip_address: "10.180.242.50" }, { subnet_id: "subnet-v6" }],
        security_groups: ["sg-default"],
      },
    })
  })

  it("returns the created port", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 201 }))

    const result = await caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-1" })

    expect(result.id).toBe("port-1")
  })

  it("rejects input without network_id before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.ports.create({ project_id: TEST_PROJECT_ID } as unknown as Parameters<typeof caller.ports.create>[0])
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(ctx.__networkPostMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid fixed IP before calling Neutron", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(
      caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-1", fixed_ips: [{ ip_address: "nope" }] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(ctx.__networkPostMock).not.toHaveBeenCalled()
  })

  it("throws CONFLICT when the IP address is already allocated", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "IP address 10.180.242.50 already allocated in subnet" })
    )

    await expect(caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message: "The requested IP or MAC address is already in use, or the subnet has no free IP addresses left.",
      })
    )
  })

  it("throws CONFLICT with the quota message on OverQuota", async () => {
    const caller = createCaller(
      createMockContext({ httpStatus: 409, statusText: "Quota exceeded for resources: ['port']." })
    )

    await expect(caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/port quota exceeded/i),
    })
  })

  it("throws NOT_FOUND when the network doesn't exist", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Network net-x could not be found" }))

    await expect(caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "The selected network, subnet or security group was not found." })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const caller = createCaller(createMockContext({ parseError: true }))

    await expect(caller.ports.create({ project_id: TEST_PROJECT_ID, network_id: "net-1" })).rejects.toThrow(
      new TRPCError({ code: "PARSE_ERROR", message: "Failed to parse response in portsRouter.create" })
    )
  })
})

describe("portsRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("puts only the provided fields", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.ports.update({
      project_id: TEST_PROJECT_ID,
      port_id: "port-1",
      name: "renamed",
      description: "",
      security_groups: [],
      qos_policy_id: null,
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/ports/port-1", {
      port: { name: "renamed", description: "", security_groups: [], qos_policy_id: null },
    })
  })

  it("returns the updated port", async () => {
    const caller = createCaller(createMockContext())

    const result = await caller.ports.update({ project_id: TEST_PROJECT_ID, port_id: "port-1", name: "renamed" })

    expect(result.id).toBe("port-1")
  })

  it("throws BAD_REQUEST without calling Neutron when no fields are provided", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await expect(caller.ports.update({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
    )
    expect(ctx.__networkPutMock).not.toHaveBeenCalled()
  })

  it("throws NOT_FOUND when the port doesn't exist", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

    await expect(
      caller.ports.update({ project_id: TEST_PROJECT_ID, port_id: "port-x", name: "renamed" })
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "Port port-x or a referenced subnet or security group was not found.",
      })
    )
  })

  it("throws CONFLICT when a requested fixed IP is in use", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 409, statusText: "IP address already allocated" }))

    await expect(
      caller.ports.update({ project_id: TEST_PROJECT_ID, port_id: "port-1", fixed_ips: [{ ip_address: "10.0.0.5" }] })
    ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/already in use/) })
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(
      caller.ports.update({ project_id: TEST_PROJECT_ID, port_id: "port-1", name: "renamed" })
    ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" }))
  })
})

describe("portsRouter.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the port delete endpoint with the requested ID", async () => {
    const ctx = createMockContext({ httpStatus: 204 })
    const caller = createCaller(ctx)

    await caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-1" })

    expect(ctx.__networkDelMock).toHaveBeenCalledWith("v2.0/ports/port-1")
  })

  it("returns true on successful deletion", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 204 }))

    expect(await caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).toBe(true)
  })

  it("throws CONFLICT when the port is owned by another resource", async () => {
    const caller = createCaller(
      createMockContext({
        httpStatus: 409,
        statusText:
          "Port port-1 cannot be deleted directly via the port API: has device owner network:router_interface.",
      })
    )

    await expect(caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).rejects.toThrow(
      new TRPCError({
        code: "CONFLICT",
        message:
          "The port is still in use by another resource (e.g. a router interface) and can't be deleted directly. Detach it first.",
      })
    )
  })

  it("throws NOT_FOUND when the port doesn't exist", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found" }))

    await expect(caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Port port-x was not found." })
    )
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const caller = createCaller(createMockContext({ invalidSession: true }))

    await expect(caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED", message: "The session is invalid" })
    )
  })
})

describe("portsRouter error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([401, 403, 404, 409])("preserves status %i thrown by signal-openstack", async (status) => {
    const caller = createCaller(createMockContext({ httpStatus: status, statusText: "Neutron error" }))

    await expect(caller.ports.delete({ project_id: TEST_PROJECT_ID, port_id: "port-1" })).rejects.not.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })

  it("still maps non-ok responses from clients that resolve instead of throwing", async () => {
    const caller = createCaller(createMockContext({ httpStatus: 404, statusText: "Not Found", errorMode: "response" }))

    await expect(caller.ports.getById({ project_id: TEST_PROJECT_ID, port_id: "port-x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Port port-x was not found." })
    )
  })

  it("rethrows unrelated errors unchanged to withErrorHandling", async () => {
    const ctx = createMockContext()
    ctx.__networkGetMock.mockRejectedValueOnce(new Error("socket hang up"))
    const caller = createCaller(ctx)

    await expect(caller.ports.list({ project_id: TEST_PROJECT_ID })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    })
  })
})
