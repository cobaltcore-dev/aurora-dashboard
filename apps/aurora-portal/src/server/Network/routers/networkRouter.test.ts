import { beforeEach, describe, expect, it, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { NETWORK_BASE_URL, networkRouter } from "./networkRouter"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  mockNetworks?: Array<Record<string, unknown>>
  httpStatus?: number
  statusText?: string
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    mockNetworks,
    httpStatus = 200,
    statusText = "OK",
  } = opts || {}

  const defaultNetworks = [
    {
      admin_state_up: true,
      created_at: "2026-03-10T10:00:00Z",
      id: "network-1",
      mtu: 1500,
      name: "public-network",
      port_security_enabled: true,
      project_id: "project-1",
      "router:external": true,
      shared: true,
      status: "ACTIVE",
      tenant_id: "tenant-1",
    },
    {
      admin_state_up: true,
      created_at: "2026-03-10T10:00:00Z",
      id: "network-2",
      mtu: 1450,
      name: "public-network-2",
      port_security_enabled: true,
      project_id: "project-1",
      "router:external": true,
      shared: false,
      status: "DOWN",
      tenant_id: "tenant-1",
    },
  ]

  const networkGetMock = vi.fn().mockImplementation(() => {
    const responseBody = parseError ? { invalid: "data" } : { networks: mockNetworks || defaultNetworks }

    return Promise.resolve({
      ok: httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      statusText,
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
  } as unknown as AuroraPortalContext & {
    __networkGetMock: typeof networkGetMock
  }
}

const createCaller = createCallerFactory(
  auroraRouter({
    network: networkRouter,
  })
)

describe("networkRouter.listExternalNetworks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns external networks on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.network.listExternalNetworks({})

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("network-1")
    expect(result[0]["router:external"]).toBe(true)
  })

  it("builds query string with router:external=true and filters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.network.listExternalNetworks({
      name: "public-network",
      project_id: "project-1",
      sort_dir: "asc",
      fields: "id",
    })

    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    const calledUrl = ctx.__networkGetMock.mock.calls[0][0] as string
    const [path, query] = calledUrl.split("?")

    expect(path).toBe(NETWORK_BASE_URL)

    const params = new URLSearchParams(query)
    expect(params.get("router:external")).toBe("true")
    expect(params.get("name")).toBe("public-network")
    expect(params.get("project_id")).toBe("project-1")
    expect(params.get("sort_dir")).toBe("asc")
    expect(params.get("fields")).toBe("id")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.network.listExternalNetworks({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "The session is invalid",
    })
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.network.listExternalNetworks({})).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network service is not available",
      })
    )
  })

  it("throws PARSE_ERROR when OpenStack response parsing fails", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(caller.network.listExternalNetworks({})).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse networks response from OpenStack",
      })
    )

    consoleErrorSpy.mockRestore()
  })

  it("throws mapped UNAUTHORIZED error when OpenStack returns 401", async () => {
    const ctx = createMockContext({
      httpStatus: 401,
      statusText: "Unauthorized",
    })
    const caller = createCaller(ctx)

    await expect(caller.network.listExternalNetworks({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized access to resource: Unauthorized",
    })
  })
})

describe("networkRouter.listDnsDomains", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns unique non-empty dns domains on success", async () => {
    const ctx = createMockContext({
      mockNetworks: [
        { dns_domain: "example.org." },
        { dns_domain: "corp.local" },
        { dns_domain: "example.org." },
        { dns_domain: "" },
        {},
      ],
    })
    const caller = createCaller(ctx)

    const result = await caller.network.listDnsDomains({})

    expect(result).toEqual(["example.org.", "corp.local"])
  })

  it("builds query string with fields=dns_domain and filters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.network.listDnsDomains({
      project_id: "project-1",
      tenant_id: "tenant-1",
      "router:external": true,
    })

    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    const calledUrl = ctx.__networkGetMock.mock.calls[0][0] as string
    const [path, query] = calledUrl.split("?")

    expect(path).toBe(NETWORK_BASE_URL)

    const params = new URLSearchParams(query)
    expect(params.get("fields")).toBe("dns_domain")
    expect(params.get("project_id")).toBe("project-1")
    expect(params.get("tenant_id")).toBe("tenant-1")
    expect(params.get("router:external")).toBe("true")
  })

  it("throws PARSE_ERROR when dns domains response parsing fails", async () => {
    const ctx = createMockContext({ parseError: true })
    const caller = createCaller(ctx)
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(caller.network.listDnsDomains({})).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse dns domains response from OpenStack",
      })
    )

    consoleErrorSpy.mockRestore()
  })
})
