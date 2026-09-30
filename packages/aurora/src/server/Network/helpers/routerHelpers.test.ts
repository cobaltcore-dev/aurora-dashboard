import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import {
  RouterErrorHandlers,
  pickDefined,
  buildExternalGatewayInfoBody,
  filterRoutersByBffParams,
  buildRouterInterfaces,
  collectSubnetIds,
  isRouterInterfacePort,
  getRouterExtensionFlags,
} from "./routerHelpers"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import { RouterSchema, type Router, type RouterPort } from "../types/router"

const makeRouter = (overrides: Record<string, unknown> = {}): Router =>
  RouterSchema.parse({
    id: "router-1",
    name: "router-1",
    status: "ACTIVE",
    admin_state_up: true,
    project_id: "proj-1",
    external_gateway_info: null,
    ...overrides,
  })

const makePort = (overrides: Partial<RouterPort> = {}): RouterPort => ({
  id: "port-1",
  name: "",
  network_id: "net-1",
  device_owner: "network:router_interface",
  status: "ACTIVE",
  fixed_ips: [{ subnet_id: "subnet-1", ip_address: "10.0.0.1" }],
  ...overrides,
})

describe("RouterErrorHandlers", () => {
  describe("shared defaults", () => {
    it("is wired to the shared error handler for unhandled statuses", () => {
      const error = RouterErrorHandlers.list({ status: 500, statusText: "Internal Server Error" })

      expect(error).toBeInstanceOf(TRPCError)
      expect(error.code).toBe(DEFAULT_ERROR_NAME)
      expect(error.message).toBe("Failed to process Router: Internal Server Error")
    })

    it("uses the router ID as resource label", () => {
      const error = RouterErrorHandlers.update({ status: 403, statusText: "Forbidden" }, "router-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
      expect(error.message).toBe("Access forbidden to router-1: Forbidden")
    })

    it("uses the default 412 handler", () => {
      const error = RouterErrorHandlers.update({ status: 412, statusText: "Precondition Failed" }, "router-1")
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[412])
    })

    it("falls back to Unknown error when statusText is missing", () => {
      expect(RouterErrorHandlers.listInterfaces({ status: 503 }, "router-1").message).toBe(
        "Failed to process router-1: Unknown error"
      )
    })
  })

  describe("404 overrides", () => {
    it.each([
      ["get", "Router router-1 was not found."],
      ["update", "Router router-1 was not found."],
      ["delete", "Router router-1 was not found."],
      ["clearGateway", "Router router-1 was not found."],
      ["setGateway", "Router router-1 or the selected external network was not found."],
      ["addInterface", "Router router-1 or the selected subnet/port was not found."],
      ["removeInterface", "The interface is not attached to router router-1."],
    ] as const)("%s returns a friendly NOT_FOUND message", (handler, message) => {
      const error = RouterErrorHandlers[handler]({ status: 404, statusText: "Not Found" }, "router-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
      expect(error.message).toBe(message)
    })

    it("create returns a NOT_FOUND message about the network or subnet", () => {
      const error = RouterErrorHandlers.create({ status: 404 })
      expect(error.message).toBe("The selected external network or subnet was not found.")
    })
  })

  describe("409 overrides", () => {
    it.each([
      ["delete", /still has attached interfaces/],
      ["clearGateway", /floating IPs are still associated/],
      ["removeInterface", /floating IPs are still associated/],
      ["addInterface", /already in use by another router/],
      ["update", /admin state is DOWN/],
      ["setGateway", /no free IP addresses/],
    ] as const)("%s returns a friendly CONFLICT message", (handler, message) => {
      const error = RouterErrorHandlers[handler]({ status: 409, statusText: "Conflict" }, "router-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toMatch(message)
    })

    it("detects Neutron OverQuota (409) and returns a quota message", () => {
      const error = RouterErrorHandlers.create({
        status: 409,
        statusText: "Quota exceeded for resources: ['router'].",
      })

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toMatch(/quota exceeded/i)
    })

    it("detects quota errors case-insensitively on other operations", () => {
      const error = RouterErrorHandlers.addInterface({ status: 409, statusText: "QUOTA exceeded for port" }, "router-1")
      expect(error.message).toMatch(/quota exceeded/i)
    })
  })

  describe("400 override on addInterface", () => {
    it("appends Neutron's detail", () => {
      const error = RouterErrorHandlers.addInterface(
        { status: 400, statusText: "Router already has a port on subnet subnet-1" },
        "router-1"
      )

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[400])
      expect(error.message).toContain("Router already has a port on subnet subnet-1")
    })

    it("omits the detail when statusText is missing", () => {
      const error = RouterErrorHandlers.addInterface({ status: 400 }, "router-1")
      expect(error.message).not.toContain("(")
    })
  })
})

describe("pickDefined", () => {
  it("drops undefined but keeps falsy values", () => {
    expect(pickDefined({ a: undefined, b: false, c: "", d: 0, e: null })).toEqual({ b: false, c: "", d: 0, e: null })
  })
})

describe("buildExternalGatewayInfoBody", () => {
  it("includes only network_id when nothing else is provided", () => {
    expect(buildExternalGatewayInfoBody({ network_id: "ext-net-1" })).toEqual({ network_id: "ext-net-1" })
  })

  it("keeps enable_snat=false and strips undefined fixed IP fields", () => {
    expect(
      buildExternalGatewayInfoBody({
        network_id: "ext-net-1",
        enable_snat: false,
        external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: undefined }],
      })
    ).toEqual({ network_id: "ext-net-1", enable_snat: false, external_fixed_ips: [{ subnet_id: "ext-subnet-1" }] })
  })
})

describe("filterRoutersByBffParams", () => {
  const routers = [
    makeRouter({ id: "a", status: "ACTIVE", external_gateway_info: { network_id: "ext-net-1" } }),
    makeRouter({ id: "b", status: "DOWN" }),
    makeRouter({ id: "c", status: "ERROR", external_gateway_info: undefined }),
  ]

  it("returns all routers without filters", () => {
    expect(filterRoutersByBffParams(routers, {})).toHaveLength(3)
  })

  it("filters by status case-insensitively", () => {
    expect(filterRoutersByBffParams(routers, { status: "down" }).map((r) => r.id)).toEqual(["b"])
  })

  it("filters by has_gateway, treating null and missing gateway as no gateway", () => {
    expect(filterRoutersByBffParams(routers, { has_gateway: true }).map((r) => r.id)).toEqual(["a"])
    expect(filterRoutersByBffParams(routers, { has_gateway: false }).map((r) => r.id)).toEqual(["b", "c"])
  })

  it("combines status and has_gateway", () => {
    expect(filterRoutersByBffParams(routers, { status: "ACTIVE", has_gateway: false })).toEqual([])
  })

  it("does not mutate the original array", () => {
    const original = [...routers]
    filterRoutersByBffParams(routers, { status: "DOWN" })
    expect(routers).toEqual(original)
  })
})

describe("isRouterInterfacePort", () => {
  it.each([
    ["network:router_interface", true],
    ["network:router_interface_distributed", true],
    ["network:ha_router_replicated_interface", true],
    ["network:router_gateway", false],
    ["network:router_centralized_snat", false],
    ["compute:nova", false],
  ])("%s -> %s", (deviceOwner, expected) => {
    expect(isRouterInterfacePort(makePort({ device_owner: deviceOwner }))).toBe(expected)
  })
})

describe("collectSubnetIds", () => {
  it("returns unique subnet IDs across ports and fixed IPs", () => {
    const ports = [
      makePort(),
      makePort({
        id: "port-2",
        fixed_ips: [
          { subnet_id: "subnet-1", ip_address: "10.0.0.2" },
          { subnet_id: "subnet-v6", ip_address: "2001:db8::1" },
        ],
      }),
    ]
    expect(collectSubnetIds(ports)).toEqual(["subnet-1", "subnet-v6"])
  })

  it("returns an empty array for ports without fixed IPs", () => {
    expect(collectSubnetIds([makePort({ fixed_ips: [] })])).toEqual([])
  })
})

describe("buildRouterInterfaces", () => {
  it("excludes gateway and SNAT ports and enriches subnet info", () => {
    const ports = [
      makePort(),
      makePort({ id: "gw", device_owner: "network:router_gateway" }),
      makePort({ id: "snat", device_owner: "network:router_centralized_snat" }),
    ]

    const result = buildRouterInterfaces(ports, [{ id: "subnet-1", name: "private", cidr: "10.0.0.0/24" }])

    expect(result).toHaveLength(1)
    expect(result[0].port_id).toBe("port-1")
    expect(result[0].fixed_ips[0]).toEqual({
      subnet_id: "subnet-1",
      subnet_name: "private",
      subnet_cidr: "10.0.0.0/24",
      ip_address: "10.0.0.1",
    })
  })

  it("leaves subnet name/CIDR undefined without enrichment", () => {
    const [iface] = buildRouterInterfaces([makePort()])
    expect(iface.fixed_ips[0].subnet_name).toBeUndefined()
    expect(iface.fixed_ips[0].subnet_cidr).toBeUndefined()
  })

  it("returns an empty array when there are no interface ports", () => {
    expect(buildRouterInterfaces([makePort({ device_owner: "network:router_gateway" })])).toEqual([])
  })
})

describe("getRouterExtensionFlags", () => {
  it("maps extension aliases to flags", () => {
    expect(
      getRouterExtensionFlags(["dvr", "extraroute", "router-extend-ndp-proxy", "external-gateway-multihoming"])
    ).toEqual({
      dvr: true,
      l3Ha: false,
      extraRoute: true,
      extGwMode: false,
      ndpProxy: true,
      externalGatewayMultihoming: true,
      availabilityZone: false,
    })
  })

  it("returns all flags false when no extensions are enabled", () => {
    expect(Object.values(getRouterExtensionFlags([])).every((flag) => flag === false)).toBe(true)
  })
})
