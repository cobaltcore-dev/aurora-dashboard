import { beforeEach, describe, expect, it, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { PORT_BASE_URL, portRouter } from "./portRouter"
import { AvailablePort } from "../types/port"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: {
  noNetworkService?: boolean
  invalidSession?: boolean
  parseError?: boolean
  mockPorts?: AvailablePort[]
  httpStatus?: number
  statusText?: string
}) => {
  const {
    noNetworkService = false,
    invalidSession = false,
    parseError = false,
    mockPorts,
    httpStatus = 200,
    statusText = "OK",
  } = opts || {}

  const defaultPorts: AvailablePort[] = [
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

  const networkGetMock = vi.fn().mockImplementation(() => {
    const responseBody = parseError ? { invalid: "data" } : { ports: mockPorts || defaultPorts }

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
    __networkGetMock: networkGetMock,
  } as unknown as AuroraPortalContext & {
    __networkGetMock: typeof networkGetMock
  }
}

const createCaller = createCallerFactory(
  auroraRouter({
    port: portRouter,
  })
)

describe("portRouter.listAvailablePorts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns available ports on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.port.listAvailablePorts({})

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("port-1")
    expect(result[0].name).toBe("web-port")
    expect(result[0].fixed_ips).toHaveLength(1)
  })

  it("builds query string with defaults and filters", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    await caller.port.listAvailablePorts({
      network_id: "network-1",
      name: "web-port",
      limit: 20,
    })

    expect(ctx.__networkGetMock).toHaveBeenCalledTimes(1)
    const calledUrl = ctx.__networkGetMock.mock.calls[0][0] as string
    const [path, query] = calledUrl.split("?")

    expect(path).toBe(PORT_BASE_URL)

    const params = new URLSearchParams(query)
    expect(params.get("status")).toBe("ACTIVE")
    expect(params.get("admin_state_up")).toBe("true")
    expect(params.get("network_id")).toBe("network-1")
    expect(params.get("name")).toBe("web-port")
    expect(params.get("limit")).toBe("20")
    expect(params.getAll("fields")).toEqual(expect.arrayContaining(["id", "name", "fixed_ips"]))
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(caller.port.listAvailablePorts({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "The session is invalid",
    })
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(caller.port.listAvailablePorts({})).rejects.toThrow(
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

    await expect(caller.port.listAvailablePorts({})).rejects.toThrow(
      new TRPCError({
        code: "PARSE_ERROR",
        message: "Failed to parse response in portRouter.listAvailablePorts",
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

    await expect(caller.port.listAvailablePorts({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized access to Port: Unauthorized",
    })
  })
})
