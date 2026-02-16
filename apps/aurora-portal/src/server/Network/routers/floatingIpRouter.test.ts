import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { floatingIpRouter } from "./floatingIpRouter"
import { FloatingIp } from "../types/floatingIp"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: { noNetworkService?: boolean; invalidSession?: boolean; parseError?: boolean }) => {
  const { noNetworkService = false, invalidSession = false, parseError = false } = opts || {}

  const mockFloatingIpsResponse = {
    floatingips: [
      {
        id: "fip-1",
        floating_ip_address: "192.0.2.1",
        fixed_ip_address: "10.0.0.5",
        port_id: "port-1",
        router_id: "router-1",
        project_id: "proj-1",
        tenant_id: "proj-1",
        floating_network_id: "net-1",
        status: "ACTIVE" as const,
        revision_number: 1,
        description: "Test floating IP",
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
        status: "DOWN" as const,
        revision_number: 2,
        description: null,
      },
    ],
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: {
      service: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName !== "network" || noNetworkService) {
          return null
        }

        return {
          get: vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue(parseError ? { invalid: "data" } : mockFloatingIpsResponse),
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
    floatingIp: floatingIpRouter,
  })
)

describe("floatingIpRouter.listFloatingIPs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of floating IPs on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.listFloatingIPs({})

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

    await expect(caller.floatingIp.listFloatingIPs({})).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.listFloatingIPs({})).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when response cannot be parsed", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)

    await expect(caller.floatingIp.listFloatingIPs({})).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse floating IPs response from OpenStack",
      })
    )
  })

  it("accepts pagination parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.listFloatingIPs({
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

    const result = await caller.floatingIp.listFloatingIPs({
      sort_key: "floating_ip_address",
      sort_dir: "asc",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it("accepts filtering parameters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.floatingIp.listFloatingIPs({
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

    const result = await caller.floatingIp.listFloatingIPs({
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
    const result = await caller.floatingIp.listFloatingIPs({})

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })
})
