import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { floatingIpRouter } from "./floatingIpRouter"
import { FloatingIp } from "../types/floatingIp"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  mockFloatingIps?: FloatingIp[]
  mockFloatingIpDetail?: FloatingIp
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    mockFloatingIps,
    mockFloatingIpDetail,
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

  const networkGetMock = vi.fn().mockImplementation((url: string) => {
    const isDetailRequest = url.startsWith("v2.0/floatingips/")
    const responseBody = parseError
      ? { invalid: "data" }
      : isDetailRequest
        ? { floatingip: mockFloatingIpDetail || defaultFloatingIps[0] }
        : { floatingips: mockFloatingIps || defaultFloatingIps }

    return Promise.resolve({
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: {
      service: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName !== "network" || noNetworkService) {
          return null
        }

        return {
          get: networkGetMock,
        }
      }),
    },
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn(),
    getMultipartData: vi.fn(),
    __networkGetMock: networkGetMock,
  } as unknown as AuroraPortalContext & { __networkGetMock: typeof networkGetMock }
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

    const result = await caller.floatingIp.list({})

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

    await expect(caller.floatingIp.list({})).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({})).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.list({})).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse floating IPs response from OpenStack",
      })
    )
  })

  it("accepts pagination parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
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
      status: "ACTIVE",
      floating_network_id: "net-1",
      project_id: "proj-1",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("accepts all parameter types together", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.list({
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
      project_id: "proj-1",
      tenant_id: "proj-1",
      floating_network_id: "net-1",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("returns empty array when no floating IPs exist", async () => {
    const ctx = {
      ...createMockContext(),
      openstack: {
        service: vi.fn().mockImplementation((serviceName: string) => {
          if (serviceName !== "network") {
            return null
          }

          return {
            get: vi.fn().mockResolvedValue({
              json: vi.fn().mockResolvedValue({
                floatingips: [],
              }),
            }),
          }
        }),
      },
    } as unknown as AuroraPortalContext

    const caller = createCaller(ctx)
    const result = await caller.floatingIp.list({})

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

      const result = await caller.floatingIp.list({})

      expect(result.length).toBe(3)
    })

    it("filters floating IPs by description (case-insensitive)", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ searchTerm: "web" })

      expect(result.length).toBe(2)
      const ids = result.map((fip) => fip.id).sort()
      expect(ids).toEqual(["fip-1", "fip-3"])
    })

    it("returns empty array when searchTerm matches no descriptions", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ searchTerm: "nonexistent" })

      expect(result.length).toBe(0)
    })

    it("trims whitespace in searchTerm", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ searchTerm: "  database  " })

      expect(result.length).toBe(1)
      expect(result[0].id).toBe("fip-2")
    })

    it("returns all results when searchTerm is empty string", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ searchTerm: "" })

      expect(result.length).toBe(3)
    })

    it("returns all results when searchTerm is only whitespace", async () => {
      const ctx = createMockContext({ mockFloatingIps })
      const caller = createCaller(ctx)

      const result = await caller.floatingIp.list({ searchTerm: "   " })

      expect(result.length).toBe(3)
    })
  })
})

describe("floatingIpRouter.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the floating IP detail endpoint with the requested ID", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.floatingIp.getById({ floatingip_id: "fip-123" })

    expect(ctx.__networkGetMock).toHaveBeenCalledWith("v2.0/floatingips/fip-123")
  })

  it("returns a floating IP on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.getById({ floatingip_id: "fip-1" })

    expect(result).not.toBeNull()
    expect(result?.id).toBe("fip-1")
    expect(result?.floating_ip_address).toBe("192.0.2.1")
    expect(result?.status).toBe("ACTIVE")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.getById({ floatingip_id: "fip-1" })).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse floating IP response from OpenStack",
      })
    )
  })
})
