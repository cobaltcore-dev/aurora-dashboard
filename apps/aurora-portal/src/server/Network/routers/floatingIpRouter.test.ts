import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { floatingIpRouter } from "./floatingIpRouter"
import { AvailablePort, ExternalNetwork, FloatingIp } from "../types/floatingIp"
import { AuroraPortalContext } from "@/server/context"

const TEST_PROJECT_ID = "proj-1"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  mockFloatingIps?: FloatingIp[]
  mockFloatingIpDetail?: FloatingIp
  mockExternalNetworks?: ExternalNetwork[]
  mockAvailablePorts?: AvailablePort[]
  httpStatus?: number
  createSuccess?: boolean
  deleteSuccess?: boolean
  updateSuccess?: boolean
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    mockFloatingIps,
    mockFloatingIpDetail,
    mockExternalNetworks,
    mockAvailablePorts,
    httpStatus = 200,
    createSuccess = true,
    deleteSuccess = true,
    updateSuccess = true,
  } = opts || {}

  const defaultFloatingIps: FloatingIp[] = [
    {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.5",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 1,
      description: "Public IP for web server",
    },
    {
      id: "fip-2",
      floating_ip_address: "192.0.2.2",
      fixed_ip_address: null,
      port_id: null,
      router_id: null,
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "DOWN",
      revision_number: 2,
      description: "Database access IP",
    },
  ]

  const defaultAvailablePorts: AvailablePort[] = [
    {
      id: "port-1",
      name: "web-port",
      fixed_ips: [{ ip_address: "10.0.0.5", subnet_id: "subnet-1" }],
    },
    {
      id: "port-2",
      name: "db-port",
      fixed_ips: [{ ip_address: "10.0.0.6", subnet_id: "subnet-1" }],
    },
  ]

  const defaultExternalNetworks: ExternalNetwork[] = [
    {
      id: "ext-net-1",
      name: "public-network",
      project_id: "admin-project",
      "router:external": true,
      shared: true,
      status: "ACTIVE",
      is_default: true,
    },
  ]

  const networkGetMock = vi.fn().mockImplementation((url: string) => {
    const isPortsRequest = url.startsWith("v2.0/ports")
    const isNetworksRequest = url.startsWith("v2.0/networks")
    const isDetailRequest = url.startsWith("v2.0/floatingips/")
    const responseBody = parseError
      ? { invalid: "data" }
      : isPortsRequest
        ? { ports: mockAvailablePorts || defaultAvailablePorts }
        : isNetworksRequest
          ? { networks: mockExternalNetworks || defaultExternalNetworks }
          : isDetailRequest
            ? { floatingip: mockFloatingIpDetail || defaultFloatingIps[0] }
            : { floatingips: mockFloatingIps || defaultFloatingIps }

    return Promise.resolve({
      ok: httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      statusText: httpStatus === 401 ? "Unauthorized" : httpStatus === 404 ? "Not Found" : "OK",
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const networkPutMock = vi.fn().mockImplementation(() => {
    const responseBody = parseError
      ? { invalid: "data" }
      : { floatingip: mockFloatingIpDetail || defaultFloatingIps[0] }

    return Promise.resolve({
      ok: updateSuccess && httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      statusText: httpStatus === 401 ? "Unauthorized" : httpStatus === 404 ? "Not Found" : "OK",
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const networkPostMock = vi.fn().mockImplementation(() => {
    const responseBody = parseError
      ? { invalid: "data" }
      : { floatingip: mockFloatingIpDetail || defaultFloatingIps[0] }

    return Promise.resolve({
      ok: createSuccess && httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      statusText: httpStatus === 401 ? "Unauthorized" : httpStatus === 404 ? "Not Found" : "OK",
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const networkDelMock = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: deleteSuccess && httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      statusText: httpStatus === 401 ? "Unauthorized" : httpStatus === 404 ? "Not Found" : "OK",
    })
  })

  const mockOpenstackSession = {
    service: vi.fn().mockImplementation((serviceName: string) => {
      if (serviceName !== "network" || noNetworkService) {
        return null
      }

      return {
        get: networkGetMock,
        post: networkPostMock,
        put: networkPutMock,
        del: networkDelMock,
      }
    }),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
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
    floatingIp: floatingIpRouter,
  })
)

describe("floatingIpRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of floating IPs on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)

    const fip1: FloatingIp = result[0]
    expect(fip1.id).toBe("fip-1")
    expect(fip1.floating_ip_address).toBe("192.0.2.1")
    expect(fip1.status).toBe("ACTIVE")
    expect(fip1.fixed_ip_address).toBe("10.0.0.5")
    expect(fip1.port_id).toBe("port-1")

    const fip2: FloatingIp = result[1]
    expect(fip2.id).toBe("fip-2")
    expect(fip2.floating_ip_address).toBe("192.0.2.2")
    expect(fip2.status).toBe("DOWN")
    expect(fip2.fixed_ip_address).toBeNull()
    expect(fip2.port_id).toBeNull()
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in floatingIpRouter.list",
      })
    )
  })

  it("throws error when API returns non-ok response", async () => {
    const ctx = createMockContext({ httpStatus: 401 })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(TRPCError)
  })

  it("accepts pagination parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
      project_id: TEST_PROJECT_ID,
      limit: 10,
      marker: "fip-1",
      page_reverse: false,
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("accepts sorting parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
      project_id: TEST_PROJECT_ID,
      sort_key: "floating_ip_address",
      sort_dir: "asc",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("accepts filtering parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
      project_id: TEST_PROJECT_ID,
      status: "ACTIVE",
      floating_network_id: "net-1",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("accepts all parameter types together", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
      project_id: TEST_PROJECT_ID,
      limit: 20,
      marker: "fip-0",
      page_reverse: false,
      sort_key: "id",
      sort_dir: "desc",
      status: "ACTIVE",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.5",
      port_id: "port-1",
      router_id: "router-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("returns empty array when no floating IPs exist", async () => {
    const mockOpenstackSession = {
      service: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName !== "network") {
          return null
        }

        return {
          get: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: "OK",
            json: vi.fn().mockResolvedValue({
              floatingips: [],
            }),
          }),
          del: vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
          }),
        }
      }),
    }

    const ctx = {
      ...createMockContext(),
      openstack: mockOpenstackSession,
      rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
    } as unknown as AuroraPortalContext

    const caller = createCaller(ctx)
    const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  describe("BFF-side search filtering", () => {
    const mockFloatingIps: FloatingIp[] = [
      {
        id: "fip-1",
        floating_ip_address: "192.0.2.1",
        fixed_ip_address: "10.0.0.5",
        port_id: "port-1",
        router_id: "router-1",
        project_id: "proj-1",
        tenant_id: "proj-1",
        floating_network_id: "net-1",
        status: "ACTIVE",
        revision_number: 1,
        description: "Public IP for web servers",
      },
      {
        id: "fip-2",
        floating_ip_address: "192.0.2.2",
        fixed_ip_address: null,
        port_id: null,
        router_id: null,
        project_id: "proj-1",
        tenant_id: "proj-1",
        floating_network_id: "net-1",
        status: "DOWN",
        revision_number: 2,
        description: "Database access IP",
      },
      {
        id: "fip-3",
        floating_ip_address: "192.0.2.3",
        fixed_ip_address: null,
        port_id: null,
        router_id: null,
        project_id: "proj-1",
        tenant_id: "proj-1",
        floating_network_id: "net-2",
        status: "ERROR",
        revision_number: 3,
        description: "Staging web endpoint",
      },
    ]

    it("returns all floating IPs when no searchTerm is provided", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID })

      expect(result.length).toBe(3)
    })

    it("filters floating IPs by description (case-insensitive)", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID, searchTerm: "web" })

      expect(result.length).toBe(2)
      const ids = result.map((fip) => fip.id).sort()
      expect(ids).toEqual(["fip-1", "fip-3"])
    })

    it("returns empty array when searchTerm matches no descriptions", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID, searchTerm: "nonexistent" })

      expect(result.length).toBe(0)
    })

    it("trims whitespace in searchTerm", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID, searchTerm: "  database  " })

      expect(result.length).toBe(1)
      expect(result[0].id).toBe("fip-2")
    })

    it("returns all results when searchTerm is empty string", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID, searchTerm: "" })

      expect(result.length).toBe(3)
    })

    it("returns all results when searchTerm is only whitespace", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ project_id: TEST_PROJECT_ID, searchTerm: "   " })

      expect(result.length).toBe(3)
    })
  })
})

describe("floatingIpRouter.listExternalNetworks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns external networks on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.listExternalNetworks({ project_id: TEST_PROJECT_ID })

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("ext-net-1")
    expect(result[0]["router:external"]).toBe(true)
  })

  it("does not forward project_id to the networks query", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.listExternalNetworks({ project_id: TEST_PROJECT_ID })

    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    const calledUrl = ctx.__networkGetMock.mock.calls[0][0] as string
    const [path, query] = calledUrl.split("?")

    expect(path).toBe("v2.0/networks")

    const params = new URLSearchParams(query)
    expect(params.get("router:external")).toBe("true")
    expect(params.get("project_id")).toBe(null)
  })
})

describe("floatingIpRouter.listAvailablePorts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns available ports on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.listAvailablePorts({ project_id: TEST_PROJECT_ID })

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("port-1")
    expect(result[0].name).toBe("web-port")
    expect(result[0].fixed_ips).toEqual([{ ip_address: "10.0.0.5", subnet_id: "subnet-1" }])
  })

  it("builds the ports query string with defaults and selected fields", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.listAvailablePorts({
      project_id: TEST_PROJECT_ID,
    })

    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    const calledUrl = ctx.__networkGetMock.mock.calls[0][0] as string
    const [path, query] = calledUrl.split("?")

    expect(path).toBe("v2.0/ports")

    const params = new URLSearchParams(query)
    expect(params.get("project_id")).toBe(TEST_PROJECT_ID)
    expect(params.get("status")).toBe("ACTIVE")
    expect(params.get("admin_state_up")).toBe("true")
    expect(params.getAll("fields")).toEqual(["id", "name", "fixed_ips"])
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.listAvailablePorts({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.listAvailablePorts({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when the ports response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.listAvailablePorts({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in portRouter.listAvailablePorts",
      })
    )
  })
})

describe("floatingIpRouter.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the floating IP create endpoint with request body", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.create({
      project_id: TEST_PROJECT_ID,
      tenant_id: "tenant-1",
      floating_network_id: "net-external-1",
    })

    expect(ctx.__networkPostMock).toHaveBeenCalledWith("v2.0/floatingips", {
      floatingip: {
        tenant_id: "tenant-1",
        project_id: TEST_PROJECT_ID,
        floating_network_id: "net-external-1",
      },
    })
  })

  it("returns created floating IP on success", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-new",
      floating_ip_address: "203.0.113.50",
      fixed_ip_address: null,
      port_id: null,
      router_id: null,
      project_id: "project-1",
      tenant_id: "tenant-1",
      floating_network_id: "net-external-1",
      status: "DOWN",
      revision_number: 1,
      description: "New floating IP",
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.create({
      project_id: TEST_PROJECT_ID,
      tenant_id: "tenant-1",
      floating_network_id: "net-external-1",
    })

    expect(result.id).toBe("fip-new")
    expect(result.floating_ip_address).toBe("203.0.113.50")
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(
      caller.floatingIp.create({
        project_id: TEST_PROJECT_ID,
        tenant_id: "tenant-1",
        floating_network_id: "net-external-1",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in floatingIpRouter.create",
      })
    )
  })

  it("throws error when API returns non-ok response", async () => {
    const ctx = createMockContext({ httpStatus: 400, createSuccess: false })
    const caller = createCaller(ctx)

    await expect(
      caller.floatingIp.create({
        project_id: TEST_PROJECT_ID,
        tenant_id: "tenant-1",
        floating_network_id: "net-external-1",
      })
    ).rejects.toThrow(TRPCError)
  })
})

describe("floatingIpRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the floating IP detail endpoint with the requested ID", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-123" })

    expect(ctx.__networkGetMock).toHaveBeenCalledWith("v2.0/floatingips/fip-123")
  })

  it("returns a floating IP on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })

    expect(result).not.toBeNull()
    expect(result?.id).toBe("fip-1")
    expect(result?.floating_ip_address).toBe("192.0.2.1")
    expect(result?.status).toBe("ACTIVE")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in floatingIpRouter.getById",
      })
    )
  })

  it("throws error when API returns non-ok response", async () => {
    const ctx = createMockContext({ httpStatus: 404 })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      TRPCError
    )
  })
})

describe("floatingIpRouter.update", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the floating IP update endpoint with the correct path and request body", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-123",
      port_id: "port-456",
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/floatingips/fip-123", {
      floatingip: {
        port_id: "port-456",
      },
    })
  })

  it("updates a floating IP on success", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.10",
      port_id: "port-456",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 2,
      description: "Updated floating IP",
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: "port-456",
    })

    expect(result).not.toBeNull()
    expect(result.id).toBe("fip-1")
    expect(result.port_id).toBe("port-456")
  })

  it("disassociates a floating IP by setting port_id to null", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: null,
      port_id: null,
      router_id: null,
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "DOWN",
      revision_number: 3,
      description: "Disassociated floating IP",
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: null,
    })

    expect(result.port_id).toBeNull()
    expect(result.fixed_ip_address).toBeNull()
  })

  it("updates floating IP with optional description field", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.5",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 2,
      description: "New description",
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: "port-1",
      description: "New description",
    })

    expect(result.description).toBe("New description")
  })

  it("updates floating IP with optional fixed_ip_address field", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.20",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 2,
      description: "Updated fixed IP",
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: "port-1",
      fixed_ip_address: "10.0.0.20",
    })

    expect(result.fixed_ip_address).toBe("10.0.0.20")
  })

  it("updates floating IP with optional distributed field", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.5",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 2,
      description: "Distributed FIP",
      distributed: true,
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: "port-1",
      distributed: true,
    })

    expect(result.distributed).toBe(true)
  })

  it("updates floating IP with combined optional fields", async () => {
    const mockFloatingIpDetail: FloatingIp = {
      id: "fip-1",
      floating_ip_address: "192.0.2.1",
      fixed_ip_address: "10.0.0.20",
      port_id: "port-1",
      router_id: "router-1",
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
      status: "ACTIVE",
      revision_number: 3,
      description: "Fully updated FIP",
      distributed: true,
    }

    const ctx = createMockContext({ mockFloatingIpDetail })
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.update({
      project_id: TEST_PROJECT_ID,
      floatingip_id: "fip-1",
      port_id: "port-1",
      fixed_ip_address: "10.0.0.20",
      description: "Fully updated FIP",
      distributed: true,
    })

    expect(ctx.__networkPutMock).toHaveBeenCalledWith("v2.0/floatingips/fip-1", {
      floatingip: {
        port_id: "port-1",
        fixed_ip_address: "10.0.0.20",
        description: "Fully updated FIP",
        distributed: true,
      },
    })

    expect(result.description).toBe("Fully updated FIP")
    expect(result.distributed).toBe(true)
    expect(result.fixed_ip_address).toBe("10.0.0.20")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.floatingIp.update({
        project_id: TEST_PROJECT_ID,
        floatingip_id: "fip-1",
        port_id: "port-456",
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
      caller.floatingIp.update({
        project_id: TEST_PROJECT_ID,
        floatingip_id: "fip-1",
        port_id: "port-456",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(
      caller.floatingIp.update({
        project_id: TEST_PROJECT_ID,
        floatingip_id: "fip-1",
        port_id: "port-456",
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in floatingIpRouter.update",
      })
    )
  })

  it("throws error when API returns non-ok response", async () => {
    const ctx = createMockContext({ httpStatus: 404, updateSuccess: false })
    const caller = createCaller(ctx)

    await expect(
      caller.floatingIp.update({
        project_id: TEST_PROJECT_ID,
        floatingip_id: "fip-1",
        port_id: "port-456",
      })
    ).rejects.toThrow(TRPCError)
  })
})

describe("floatingIpRouter.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the floating IP delete endpoint with the requested ID", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.delete({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-123" })

    expect(ctx.__networkDelMock).toHaveBeenCalledWith("v2.0/floatingips/fip-123")
  })

  it("returns true on successful deletion", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.delete({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })

    expect(result).toBe(true)
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.delete({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.delete({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws error when API returns non-ok response", async () => {
    const ctx = createMockContext({ httpStatus: 404, deleteSuccess: false })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.delete({ project_id: TEST_PROJECT_ID, floatingip_id: "fip-1" })).rejects.toThrow(
      TRPCError
    )
  })
})
